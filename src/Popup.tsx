import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeDomain } from "@/lib/domainUtils";
import { getAllowlist, getSession, setAllowlist } from "@/lib/storage";

type SessionState = {
  isActive: boolean;
  endTime: number;
  durationMinutes: number;
  strictMode: boolean;
  startedAt: number;
};

const DEFAULT_DURATION = 25;

const Popup = () => {
  const [allowlist, setAllowlistState] = useState<string[]>([]);
  const [domainInput, setDomainInput] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [strictMode, setStrictMode] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    const loadInitial = async () => {
      const [list, currentSession] = await Promise.all([getAllowlist(), getSession()]);
      setAllowlistState(list);
      if (currentSession) {
        setSession(currentSession);
        setStrictMode(currentSession.strictMode);
        setDurationMinutes(currentSession.durationMinutes || DEFAULT_DURATION);
      }
    };
    loadInitial();

    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.allowlist?.newValue) {
        setAllowlistState(changes.allowlist.newValue as string[]);
      }
      if (changes.session?.newValue) {
        setSession(changes.session.newValue as SessionState);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = useMemo(() => {
    if (!session?.isActive) return 0;
    return Math.max(0, session.endTime - now);
  }, [session, now]);

  const remainingLabel = useMemo(() => {
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [remainingMs]);

  const handleAddDomain = async () => {
    setError(null);
    const normalized = normalizeDomain(domainInput);
    if (!normalized) {
      setError('Please enter a valid domain.');
      return;
    }
    if (allowlist.includes(normalized)) {
      setError('Domain already in allowlist.');
      return;
    }

    const next = [...allowlist, normalized].sort();
    setAllowlistState(next);
    await setAllowlist(next);
    await chrome.runtime.sendMessage({ type: 'ALLOWLIST_UPDATED' });
    setDomainInput('');
  };

  const handleRemoveDomain = async (domain: string) => {
    const next = allowlist.filter((item) => item !== domain);
    setAllowlistState(next);
    await setAllowlist(next);
    await chrome.runtime.sendMessage({ type: 'ALLOWLIST_UPDATED' });
  };

  const handleStartSession = async () => {
    setError(null);
    const duration = Math.max(1, Math.floor(durationMinutes));
    const response = await chrome.runtime.sendMessage({
      type: 'START_SESSION',
      durationMinutes: duration,
      strictMode,
    });
    if (response?.ok) {
      setSession(response.session);
    } else {
      setError(response?.error || 'Unable to start focus session.');
    }
  };

  const handleStopSession = async () => {
    const response = await chrome.runtime.sendMessage({ type: 'STOP_SESSION' });
    if (response?.ok) {
      setSession(response.session);
    }
  };

  const handleOpenDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  };

  return (
    <div className="w-[360px] p-4 bg-background text-foreground">
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Deep Focus Mode</CardTitle>
          <p className="text-sm text-muted-foreground">Allowlist only. Everything else is blocked.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="domain">Allowed Sites</Label>
            <div className="flex gap-2">
              <Input
                id="domain"
                placeholder="youtube.com"
                value={domainInput}
                onChange={(event) => setDomainInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddDomain();
                  }
                }}
              />
              <Button onClick={handleAddDomain}>Add</Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
              {allowlist.length === 0 && (
                <p className="text-xs text-muted-foreground">No allowed sites yet.</p>
              )}
              {allowlist.map((domain) => (
                <div key={domain} className="flex items-center justify-between rounded-md border border-border px-2 py-1 text-sm">
                  <span className="truncate">{domain}</span>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveDomain(domain)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Session Length (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
              disabled={Boolean(session?.isActive)}
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={strictMode}
                onChange={(event) => setStrictMode(event.target.checked)}
                disabled={Boolean(session?.isActive)}
                className="h-4 w-4 rounded border-border"
              />
              Strict mode (cannot stop early)
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Focus Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {session?.isActive ? (
            <>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm text-muted-foreground">Focus Active</p>
                  <p className="text-xl font-semibold">{remainingLabel}</p>
                </div>
                <span className="text-xs rounded-full border border-border px-2 py-1">
                  {session.strictMode ? '🔒 Strict' : 'Standard'}
                </span>
              </div>
              <Button
                variant="destructive"
                disabled={session.strictMode}
                onClick={handleStopSession}
              >
                Stop Session
              </Button>
              {session.strictMode && (
                <p className="text-xs text-muted-foreground">Strict mode is enabled. Session cannot be stopped early.</p>
              )}
              <Button variant="secondary" onClick={handleOpenDashboard}>
                See Time Dashboard
              </Button>
            </>
          ) : (
            <div className="space-y-2">
              <Button className="w-full" onClick={handleStartSession}>
                Start Focus Session
              </Button>
              <Button className="w-full" variant="secondary" onClick={handleOpenDashboard}>
                See Time Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Popup;
