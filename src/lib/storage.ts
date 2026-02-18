export type SessionState = {
  isActive: boolean;
  endTime: number;
  durationMinutes: number;
  strictMode: boolean;
  startedAt: number;
};

const DEFAULT_SESSION: SessionState = {
  isActive: false,
  endTime: 0,
  durationMinutes: 25,
  strictMode: false,
  startedAt: 0,
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
