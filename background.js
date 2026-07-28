// background.js - MV3 service worker
// Tracks which tab/job the user is looking at, links new tabs or same-tab redirects back to the
// original job posting, orchestrates Claude API calls, and keeps the application log.
import { generateTailoredContent } from './lib/claude-api.js';

const JOB_CONTEXT_PREFIX = 'jobctx_';

async function getJobContext(tabId) {
    const key = JOB_CONTEXT_PREFIX + tabId;
    const data = await chrome.storage.session.get(key);
    return data[key] || null;
}

async function setJobContext(tabId, ctx) {
    const key = JOB_CONTEXT_PREFIX + tabId;
    await chrome.storage.session.set({ [key]: ctx });
}

async function clearJobContext(tabId) {
    const key = JOB_CONTEXT_PREFIX + tabId;
    await chrome.storage.session.remove(key);
}

// Tracks the last known hostname per tab so we can detect same-tab cross-domain redirects
// (e.g. LinkedIn -> a company's Workday instance).
const lastHostByTab = new Map();

chrome.tabs.onCreated.addListener(async (tab) => {
    if (!tab.openerTabId) return;
    const ctx = await getJobContext(tab.openerTabId);
    if (!ctx) return;
    // "Regular Apply" opened a brand-new tab - link it back to the same job context so the
                                    // fill flow can auto-continue there without the user re-triggering anything.
                                    await setJobContext(tab.id, { ...ctx, linkedFrom: tab.openerTabId, continued: false });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete' || !tab.url) return;
    let host;
    try {
          host = new URL(tab.url).hostname;
    } catch (err) {
          return;
    }

                                    const ctx = await getJobContext(tabId);
    const prevHost = lastHostByTab.get(tabId);
    lastHostByTab.set(tabId, host);

                                    if (!ctx) return;

                                    const isNewHost = prevHost && prevHost !== host;
    const isFreshLinkedTab = ctx.linkedFrom && !ctx.continued;

                                    if (isNewHost || isFreshLinkedTab) {
                                          // Give the new page a moment to render its form, then ask the content script to
      // auto-continue the fill flow, reusing the job description captured earlier.
      await setJobContext(tabId, { ...ctx, continued: true });
                                          setTimeout(() => {
                                                  chrome.tabs.sendMessage(tabId, { type: 'AUTO_CONTINUE', jobContext: ctx }).catch(() => {});
                                          }, 1500);
                                    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    lastHostByTab.delete(tabId);
    clearJobContext(tabId);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    handleMessage(msg, sender)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: String((err && err.message) || err) }));
    return true;
});

async function handleMessage(msg, sender) {
    const tabId = sender.tab && sender.tab.id;

  switch (msg.type) {
    case 'JOB_DETECTED': {
            if (tabId == null) return { ok: false };
            const existing = await getJobContext(tabId);
            await setJobContext(tabId, {
                      jobTitle: msg.jobTitle || (existing && existing.jobTitle) || '',
                      company: msg.company || (existing && existing.company) || '',
                      jobDescription: msg.jobDescription || (existing && existing.jobDescription) || '',
                      sourceUrl: msg.sourceUrl,
                      site: msg.site,
                      tailored: existing && existing.tailored,
                      continued: false,
            });
            return { ok: true };
    }

    case 'GET_JOB_CONTEXT': {
            if (tabId == null) return { context: null };
            return { context: await getJobContext(tabId) };
    }

    case 'GET_PROFILE_DATA': {
            return chrome.storage.local.get(['profile', 'masterResume', 'resumeFile']);
    }

    case 'REQUEST_TAILORED_CONTENT': {
            const { apiKey } = await chrome.storage.local.get('apiKey');
            if (!apiKey) return { error: 'no_api_key' };
            const { masterResume } = await chrome.storage.local.get('masterResume');
            if (!masterResume) return { error: 'no_master_resume' };
            try {
                      const result = await generateTailoredContent({
                                  apiKey,
                                  masterResume,
                                  jobDescription: msg.jobDescription || '',
                                  jobTitle: msg.jobTitle || '',
                                  company: msg.company || '',
                      });
                      if (tabId != null) {
                                  const ctx = await getJobContext(tabId);
                                  await setJobContext(tabId, { ...(ctx || {}), tailored: result });
                      }
                      return { result };
            } catch (err) {
                      return { error: String((err && err.message) || err) };
            }
    }

    case 'FILL_ACTIVE_TAB': {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return { ok: false, error: 'no_active_tab' };
            try {
                      const resp = await chrome.tabs.sendMessage(tab.id, { type: 'RUN_FILL' });
                      return { ok: true, response: resp };
            } catch (err) {
                      return { ok: false, error: 'content_script_not_available' };
            }
    }

    case 'LOG_APPLICATION': {
            const { applicationLog = [] } = await chrome.storage.local.get('applicationLog');
            applicationLog.unshift({
                      title: msg.title || '',
                      company: msg.company || '',
                      status: msg.status || 'needs review',
                      url: msg.url || '',
                      timestamp: Date.now(),
            });
            await chrome.storage.local.set({ applicationLog: applicationLog.slice(0, 100) });
            return { ok: true };
    }

    default:
            return { ok: false, error: 'unknown_message_type' };
  }
}
