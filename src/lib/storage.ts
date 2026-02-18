export type SessionState = {
  isActive: boolean;
  endTime: number;
  durationMinutes: number;
  strictMode: boolean;
  startedAt: number;
};

export type UsageStatsByDate = Record<string, Record<string, number>>;

export type TrackingState = {
  domain: string | null;
  lastActiveAt: number;
};

const DEFAULT_SESSION: SessionState = {
  isActive: false,
  endTime: 0,
  durationMinutes: 25,
  strictMode: false,
  startedAt: 0,
};

const DEFAULT_TRACKING_STATE: TrackingState = {
  domain: null,
  lastActiveAt: 0,
};

export async function getAllowlist(): Promise<string[]> {
  const data = await chrome.storage.local.get('allowlist');
  return Array.isArray(data.allowlist) ? data.allowlist : [];
}

export async function setAllowlist(allowlist: string[]): Promise<void> {
  await chrome.storage.local.set({ allowlist });
}

export async function getSession(): Promise<SessionState | null> {
  const data = await chrome.storage.local.get('session');
  if (!data.session) return null;
  return { ...DEFAULT_SESSION, ...data.session } as SessionState;
}

export async function setSession(session: SessionState): Promise<void> {
  await chrome.storage.local.set({ session });
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.set({ session: DEFAULT_SESSION });
}

export async function getStatsByDate(): Promise<UsageStatsByDate> {
  const data = await chrome.storage.local.get('statsByDate');
  return (data.statsByDate || {}) as UsageStatsByDate;
}

export async function getStatsForDate(dateKey: string): Promise<Record<string, number>> {
  const statsByDate = await getStatsByDate();
  return statsByDate[dateKey] || {};
}

export async function setStatsForDate(dateKey: string, stats: Record<string, number>): Promise<void> {
  const statsByDate = await getStatsByDate();
  statsByDate[dateKey] = stats;
  await chrome.storage.local.set({ statsByDate });
}

export async function addUsageForDomain(dateKey: string, domain: string, seconds: number): Promise<void> {
  if (!domain || seconds <= 0) return;
  const stats = await getStatsForDate(dateKey);
  const current = stats[domain] || 0;
  stats[domain] = current + seconds;
  await setStatsForDate(dateKey, stats);
}

export async function getTrackingState(): Promise<TrackingState> {
  const data = await chrome.storage.local.get('trackingState');
  if (!data.trackingState) return { ...DEFAULT_TRACKING_STATE };
  return { ...DEFAULT_TRACKING_STATE, ...data.trackingState } as TrackingState;
}

export async function setTrackingState(state: TrackingState): Promise<void> {
  await chrome.storage.local.set({ trackingState: state });
}
