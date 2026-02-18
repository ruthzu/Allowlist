/// <reference types="chrome" />
import { normalizeAllowlist } from "@/lib/domainUtils";
import { clearSession, getAllowlist, getSession, setSession, type SessionState } from "@/lib/storage";

type BackgroundMessage =
  | { type: 'START_SESSION'; durationMinutes: number; strictMode: boolean }
  | { type: 'STOP_SESSION' }
  | { type: 'ALLOWLIST_UPDATED' }
  | { type: 'GET_SESSION' };

const RULE_ID = 1;
const ALARM_NAME = 'focusSessionEnd';

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
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID],
  });
}

async function startSession(durationMinutes: number, strictMode: boolean): Promise<SessionState> {
  const start = Date.now();
  const endTime = start + durationMinutes * 60 * 1000;
  const session: SessionState = {
    isActive: true,
    endTime,
    durationMinutes,
    strictMode,
    startedAt: start,
  };

  const allowlist = await getAllowlist();
  await applyBlockingRules(allowlist);
  await setSession(session);
  chrome.alarms.create(ALARM_NAME, { when: endTime });
  return session;
}

async function stopSession(): Promise<SessionState> {
  await clearBlockingRules();
  await clearSession();
  chrome.alarms.clear(ALARM_NAME);
  return {
    isActive: false,
    endTime: 0,
    durationMinutes: 25,
    strictMode: false,
    startedAt: 0,
  };
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
  if (alarm.name === ALARM_NAME) {
    await stopSession();
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['allowlist', 'session']);
  if (!Array.isArray(data.allowlist)) {
    await chrome.storage.local.set({ allowlist: [] });
  }
  if (!data.session) {
    await clearSession();
  }
  await restoreSession();
});

chrome.runtime.onStartup.addListener(async () => {
  await restoreSession();
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
