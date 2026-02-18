import React, { useEffect, useMemo, useState } from 'react';
import { getSession } from '@/lib/storage';

const BlockPage = () => {
  const [endTime, setEndTime] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      const session = await getSession();
      if (session?.isActive) {
        setEndTime(session.endTime);
      }
    };
    loadSession();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = useMemo(() => Math.max(0, endTime - now), [endTime, now]);
  const remainingLabel = useMemo(() => {
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [remainingMs]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="max-w-md text-center space-y-4 p-6">
        <div className="text-4xl">🚫</div>
        <h1 className="text-2xl font-semibold">Deep Focus Mode Active</h1>
        <p className="text-muted-foreground">This website is not on your allowlist.</p>
        <div className="rounded-xl border border-border px-6 py-4 text-3xl font-semibold tracking-wider">
          {remainingLabel}
        </div>
        <p className="text-xs text-muted-foreground">Stay locked in. You can visit allowed sites only.</p>
      </div>
    </div>
  );
};

export default BlockPage;
