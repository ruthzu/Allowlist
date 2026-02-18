/// <reference types="chrome" />
import { normalizeAllowlist, normalizeDomain } from "@/lib/domainUtils";
import {
  addUsageForDomain,
  clearSession,
  getAllowlist,
  getSession,
  getTrackingState,
  setSession,
  setTrackingState,
  type SessionState,
} from "@/lib/storage";

type BackgroundMessage =
  | { type: 'START_SESSION'; durationMinutes: number; strictMode: boolean }
  | { type: 'STOP_SESSION' }
  | { type: 'ALLOWLIST_UPDATED' }
  | { type: 'GET_SESSION' };

const RULE_ID = 1;
const ALARM_NAME = 'focusSessionEnd';
const TRACKING_ALARM = 'usageTrackingTick';

let currentDomain: string | null = null;
let lastActiveAt = Date.now();

async function applyBlockingRules(allowlist: string[]) {
  const normalized = normalizeAllowlist(allowlist);
  const redirectUrl = chrome.runtime.getURL('block.html');

  const rules: chrome.declarativeNetRequest.Rule[] = [
    {
      id: RULE_ID,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: { url: redirectUrl },
      },
      condition: {
        urlFilter: '*',
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        excludedDomains: normalized,
      },
    },
  ];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID],
    addRules: rules,
  });
}

async function clearBlockingRules() {
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [RULE_ID] });
}

async function startSession(durationMinutes: number, strictMode: boolean): Promise<SessionState> {
  const start = Date.now();
  const endTime = start + durationMinutes * 60 * 1000;
  const session: SessionState = { isActive: true, endTime, durationMinutes, strictMode, startedAt: start };

  const allowlist = await getAllowlist();
  await applyBlockingRules(allowlist);
  await setSession(session);
  chrome.alarms.create(ALARM_NAME, { when: endTime });
  return session;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function resolveActiveDomain(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.url) return null;
  const domain = normalizeDomain(tab.url);
  if (!domain) return null;
  const allowlist = normalizeAllowlist(await getAllowlist());
  const matched = allowlist.find((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
  return matched || null;
}

async function recordUsage(domain: string | null, deltaMs: number) {
  if (!domain || deltaMs <= 0) return;
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds <= 0) return;
  await addUsageForDomain(getTodayKey(), domain, seconds);
}

async function updateTrackingState(nextDomain: string | null, now = Date.now()) {
  if (currentDomain) await recordUsage(currentDomain, now - lastActiveAt);
  currentDomain = nextDomain;
  lastActiveAt = now;
  await setTrackingState({ domain: currentDomain, lastActiveAt });
}

async function tickUsage() {
  const now = Date.now();
  const activeDomain = await resolveActiveDomain();
  if (currentDomain && currentDomain === activeDomain) {
    await recordUsage(currentDomain, now - lastActiveAt);
    lastActiveAt = now;
    await setTrackingState({ domain: currentDomain, lastActiveAt });
    return;
  }
  await updateTrackingState(activeDomain, now);
}

async function initializeTracking() {
  const state = await getTrackingState();
  currentDomain = state.domain || null;
  lastActiveAt = Date.now();
  await setTrackingState({ domain: currentDomain, lastActiveAt });
  await tickUsage();
}

async function stopSession(): Promise<SessionState> {
  await clearBlockingRules();
  await clearSession();
  chrome.alarms.clear(ALARM_NAME);
  return { isActive: false, endTime: 0, durationMinutes: 25, strictMode: false, startedAt: 0 };
}

async function restoreSession() {
  const session = await getSession();
  if (!session?.isActive) return;
  if (Date.now() >= session.endTime) {
    await stopSession();
    return;
  }
  const allowlist = await getAllowlist();
  await applyBlockingRules(allowlist);
  chrome.alarms.create(ALARM_NAME, { when: session.endTime });
}

chrome.alarms.onAlarm.addListener(async (alarm: chrome.alarms.Alarm) => {
  if (alarm.name === ALARM_NAME) await stopSession();
  if (alarm.name === TRACKING_ALARM) await tickUsage();
});

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['allowlist', 'session']);
  if (!Array.isArray(data.allowlist)) await chrome.storage.local.set({ allowlist: [] });
  if (!data.session) await clearSession();
  await initializeTracking();
  chrome.alarms.create(TRACKING_ALARM, { periodInMinutes: 1 });
  await restoreSession();
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeTracking();
  chrome.alarms.create(TRACKING_ALARM, { periodInMinutes: 1 });
  await restoreSession();
});

chrome.tabs.onActivated.addListener(async () => {
  const activeDomain = await resolveActiveDomain();
  if (activeDomain !== currentDomain) await updateTrackingState(activeDomain);
});

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (!tab.active || !changeInfo.url) return;
  const activeDomain = normalizeDomain(changeInfo.url);
  if (!activeDomain) return;
  const allowlist = normalizeAllowlist(await getAllowlist());
  const matched = allowlist.find((allowed) => activeDomain === allowed || activeDomain.endsWith(`.${allowed}`));
  const nextDomain = matched || null;
  if (nextDomain !== currentDomain) await updateTrackingState(nextDomain);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await updateTrackingState(null);
    return;
  }
  const activeDomain = await resolveActiveDomain();
  if (activeDomain !== currentDomain) await updateTrackingState(activeDomain);
});

chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
  (async () => {
    if (message?.type === 'START_SESSION') {
      const duration = Number(message.durationMinutes) || 25;
      const strict = Boolean(message.strictMode);
      const session = await startSession(duration, strict);
      sendResponse({ ok: true, session });
      return;
    }
    if (message?.type === 'STOP_SESSION') {
      const session = await stopSession();
      sendResponse({ ok: true, session });
      return;
    }
    if (message?.type === 'ALLOWLIST_UPDATED') {
      const session = await getSession();
      if (session?.isActive) {
        const allowlist = await getAllowlist();
        await applyBlockingRules(allowlist);
      }
      await tickUsage();
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === 'GET_SESSION') {
      const session = await getSession();
      sendResponse({ ok: true, session });
      return;
    }
    sendResponse({ ok: false, error: 'Unknown message type.' });
  })();
  return true;
});
