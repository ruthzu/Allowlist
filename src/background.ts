/// <reference types="chrome" />
import { normalizeAllowlist } from "@/lib/domainUtils";
import { clearSession, getAllowlist, getSession, setSession, type SessionState } from "@/lib/storage";

type BackgroundMessage =
  | { type: 'START_SESSION' }
  | { type: 'STOP_SESSION' }
  | { type: 'ALLOWLIST_UPDATED' }
  | { type: 'GET_SESSION' };

const RULE_ID = 1;

async function applyBlockingRules(allowlist: string[]) {
  const normalized = normalizeAllowlist(allowlist);
  const redirectUrl = chrome.runtime.getURL('block.html');
  const rules: chrome.declarativeNetRequest.Rule[] = [
    {
      id: RULE_ID,
      priority: 1,
      action: { type: chrome.declarativeNetRequest.RuleActionType.REDIRECT, redirect: { url: redirectUrl } },
      condition: {
        urlFilter: '*',
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        excludedDomains: normalized,
      },
    },
  ];
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [RULE_ID], addRules: rules });
}

async function clearBlockingRules() {
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [RULE_ID] });
}

async function startSession(): Promise<SessionState> {
  const start = Date.now();
  const session: SessionState = { isActive: true, endTime: 0, durationMinutes: 0, strictMode: false, startedAt: start };
  const allowlist = await getAllowlist();
  await applyBlockingRules(allowlist);
  await setSession(session);
  return session;
}

async function stopSession(): Promise<SessionState> {
  await clearBlockingRules();
  await clearSession();
  return { isActive: false, endTime: 0, durationMinutes: 0, strictMode: false, startedAt: 0 };
}

async function restoreSession() {
  const session = await getSession();
  if (!session?.isActive) return;
  const allowlist = await getAllowlist();
  await applyBlockingRules(allowlist);
}

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['allowlist', 'session']);
  if (!Array.isArray(data.allowlist)) await chrome.storage.local.set({ allowlist: [] });
  if (!data.session) await clearSession();
  await restoreSession();
});

chrome.runtime.onStartup.addListener(async () => {
  await restoreSession();
});

chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender: chrome.runtime.MessageSender, sendResponse: (response: unknown) => void) => {
  (async () => {
    if (message?.type === 'START_SESSION') {
      const session = await startSession();
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
