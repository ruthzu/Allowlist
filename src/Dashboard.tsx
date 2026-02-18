import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAllowlist, getStatsForDate, getTrackingState } from '@/lib/storage';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
};

const Dashboard = () => {
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [todayKey, setTodayKey] = useState(getTodayKey());
  const [trackingDomain, setTrackingDomain] = useState<string | null>(null);
  const [lastActiveAt, setLastActiveAt] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const load = async () => {
      const [list, dayStats, tracking] = await Promise.all([
        getAllowlist(),
        getStatsForDate(getTodayKey()),
        getTrackingState(),
      ]);
      setAllowlist(list);
      setStats(dayStats);
      setTodayKey(getTodayKey());
      setTrackingDomain(tracking.domain || null);
      setLastActiveAt(tracking.lastActiveAt || 0);
    };

    load();

    const handleStorageChange = async (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.allowlist) {
        const list = await getAllowlist();
        setAllowlist(list);
      }
      if (changes.statsByDate) {
        const dayStats = await getStatsForDate(getTodayKey());
        setStats(dayStats);
        setTodayKey(getTodayKey());
      }
      if (changes.trackingState) {
        const tracking = await getTrackingState();
        setTrackingDomain(tracking.domain || null);
        setLastActiveAt(tracking.lastActiveAt || 0);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      setNow(Date.now());
      // Periodically refresh persisted stats to reflect background accumulation
      const key = getTodayKey();
      const latest = await getStatsForDate(key);
      setStats(latest);
      setTodayKey(key);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const rows = useMemo(() => {
    const list = allowlist.length > 0 ? allowlist : Object.keys(stats);
    return list
      .map((domain) => ({
        domain,
        seconds: stats[domain] || 0,
      }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [allowlist, stats]);

  const liveExtra = useMemo(() => {
    if (!trackingDomain || !lastActiveAt) return 0;
    const delta = Math.floor((now - lastActiveAt) / 1000);
    return delta > 0 ? delta : 0;
  }, [trackingDomain, lastActiveAt, now]);

  const totalSeconds = useMemo(() => {
    const base = rows.reduce((acc, row) => acc + row.seconds, 0);
    return base + (rows.some(r => r.domain === trackingDomain) ? liveExtra : 0);
  }, [rows, trackingDomain, liveExtra]);

  const chartData = useMemo(() => {
    // Convert seconds to minutes for a more readable chart scale
    return rows.map((row) => ({
      domain: row.domain,
      minutes: Math.round(row.seconds / 60),
      seconds: row.seconds,
    }));
  }, [rows]);

  const tickFormatter = (value: string) => {
    // Shorten long domain labels for axis ticks
    if (!value) return value;
    return value.length > 14 ? value.slice(0, 12) + '…' : value;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-3xl py-10 mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Usage Dashboard</h1>
          <p className="text-sm text-muted-foreground">Today · {todayKey}</p>
        </div>

        {/* Total Time card removed as requested */}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Usage by Site (minutes)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No usage data yet. Visit an allowed site to start tracking.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="domain" tickFormatter={tickFormatter} tick={{ fontSize: 12 }} interval={0} angle={-15} height={50} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip formatter={(value: number, name: string) => {
                      if (name === 'minutes') return [`${value}m`, 'Time'];
                      return [value, name];
                    }} labelFormatter={(label: string) => label} />
                    <Bar dataKey="minutes" fill="#a16207" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex items-center justify-between">
            <CardTitle className="text-base">Time Spent per Allowed Site</CardTitle>
            <Button variant="ghost" onClick={() => window.close()}>Close</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">No usage data yet. Visit an allowed site to start tracking.</p>
            )}
            {rows.map((row) => {
              const isActive = row.domain === trackingDomain;
              const seconds = isActive ? row.seconds + liveExtra : row.seconds;
              return (
                <div key={row.domain} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-sm font-medium truncate">{row.domain}</span>
                  <span className="text-sm text-muted-foreground">{formatDuration(seconds)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
