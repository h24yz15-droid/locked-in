const SESSIONS_KEY = "li_sessions";
const COMPLETED_KEY = "li_completed_sessions";
const COMPLETED_SESSIONS_CAP = 100;
const MIGRATED_KEY = "li_migrated";
const LEGACY_STORAGE_KEY = "currentWorkflow";
const SAVED_KEY = "savedTabs";
const MAX_SAVED_TABS = 50;
const WEB_URL_RE = /^https?:\/\//i;
const MAX_PROMPT_SEND_ATTEMPTS = 25;
const PROMPT_SEND_RETRY_MS = 200;
const AUTO_CLOSE_GRACE_MS = 1500;
const CHAIN_MIN_DISTINCT_TABS = 2;
const MAX_CHAIN_EVENTS = 5;
const CLEANUP_COOLDOWN_MS = 30 * 60 * 1000;
const SETTINGS_KEY = "li_settings";
const SETTINGS_DEFAULTS = {
  focusTimer: true,
  enforceTabs: true,
  organizeTabs: true,
  cleanupFrequency: 30,
};
let settingsCache = null;
async function getSettings() {
  if (settingsCache) return settingsCache;
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    settingsCache = { ...SETTINGS_DEFAULTS, ...(result[SETTINGS_KEY] || {}) };
  } catch (err) {
    settingsCache = { ...SETTINGS_DEFAULTS };
  }
  return settingsCache;
}
const CLEANUP_MAX_VISIBLE_TABS = 8;
const MIN_CLEANUP_TABS = 2;
const DEV_BYPASS_CLEANUP_KEY = "li_dev_bypass_cleanup_cooldown";

const ORGANIZE_ACTIVITY_WEIGHT_VISIT_MS = 30000;
const ORGANIZE_ACTIVITY_WEIGHT_RECENCY_MS = 120000;
const ORGANIZE_ACTIVITY_RECENCY_WINDOW_MS = 3600000;
const ORGANIZE_HYSTERESIS_DEADBAND = 1;
const ORGANIZE_COOLDOWN_MS = 1500;
const ACTIVITY_KEY = "tabActivity";

const pendingTabs = new Map();
const freshTabs = new Map();
const closeTimers = new Map();
const promptedTabs = new Set();
const newTabs = new Set();
const tabUrls = new Map();
const lastActiveTabInWindow = new Map();
const websiteOwnedWindows = new Set();
const recentlyCreatedWindows = new Map();

const TRACK_STATE_KEY = "li_track_state";
let trackPersistQueued = false;
function persistTrackingStateSoon() {
  if (trackPersistQueued) return;
  trackPersistQueued = true;
  Promise.resolve().then(async () => {
    trackPersistQueued = false;
    try {
      await chrome.storage.session.set({
        [TRACK_STATE_KEY]: {
          newTabs: Array.from(newTabs),
          promptedTabs: Array.from(promptedTabs),
          freshTabs: Array.from(freshTabs.entries()),
          pendingTabs: Array.from(pendingTabs.entries()),
        },
      });
    } catch (err) {
      // Best effort: enforcement tracking survives service worker restarts.
    }
  });
}

function hydrateTrackingState() {
  chrome.storage.session
    .get(TRACK_STATE_KEY)
    .then((result) => {
      const state = result[TRACK_STATE_KEY];
      if (!state || typeof state !== "object") return;
      if (Array.isArray(state.newTabs)) {
        for (const id of state.newTabs) newTabs.add(id);
      }
      if (Array.isArray(state.promptedTabs)) {
        for (const id of state.promptedTabs) promptedTabs.add(id);
      }
      if (Array.isArray(state.freshTabs)) {
        for (const [id, windowId] of state.freshTabs) freshTabs.set(id, windowId);
      }
      if (Array.isArray(state.pendingTabs)) {
        for (const [id, windowId] of state.pendingTabs)
          pendingTabs.set(id, windowId);
      }
    })
    .catch(() => {});
}
hydrateTrackingState();

const MAIN_ICON = {
  "16": "main-icon-16.png",
  "32": "main-icon-32.png",
  "48": "main-icon-48.png",
  "128": "main-icon-128.png",
};
const LOCKED_ICON = {
  "16": "locked-icon-16.png",
  "32": "locked-icon-32.png",
  "48": "locked-icon-48.png",
  "128": "locked-icon-128.png",
};

async function syncActionIcons(sessions) {
  try {
    const source = sessions && typeof sessions === "object" ? sessions : await readSessions();
    const windows = await chrome.windows.getAll();
    for (const win of windows) {
      const active =
        typeof win.id === "number" &&
        Boolean(source[win.id] && source[win.id].active === true);
      const tabs = await chrome.tabs.query({ windowId: win.id });
      for (const tab of tabs) {
        if (typeof tab.id !== "number") continue;
        chrome.action
          .setIcon({ tabId: tab.id, path: active ? LOCKED_ICON : MAIN_ICON })
          .catch(() => {});
      }
    }
    chrome.action.setIcon({ path: MAIN_ICON }).catch(() => {});
  } catch (err) {
    console.error("Locked In: icon sync failed", err);
  }
}

const chains = new Map();
const chainEvents = [];
let lastChainEvent = null;
let lastActivated = null;
let activeWindows = new Set();

function isUsableWebUrl(url) {
  return typeof url === "string" && WEB_URL_RE.test(url);
}

function isUnusedFreshUrl(url) {
  if (!url) return true;
  return (
    url === "about:blank" ||
    url === "about:srcdoc" ||
    url === "chrome://newtab" ||
    url.startsWith("chrome://newtab/")
  );
}

function setTabUrl(tabId, url) {
  if (tabId == null) return false;
  const web = isUsableWebUrl(url);
  tabUrls.set(tabId, { url: url || "", web });
  return web;
}

function tabIsWeb(tabId) {
  const record = tabUrls.get(tabId);
  return Boolean(record && record.web);
}

function randomId() {
  if (crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function hostnameFor(url) {
  if (typeof url !== "string" || !url) return "";
  try {
    return new URL(url).hostname;
  } catch (err) {
    return "";
  }
}

function makeSession({ active = false, workflow = "", checklist = [] } = {}) {
  const now = Date.now();
  return {
    id: randomId(),
    active,
    workflow: typeof workflow === "string" ? workflow.trim() : "",
    checklist: Array.isArray(checklist) ? checklist : [],
    lastCleanupChainAt: null,
    lastCleanupPromptAt: null,
    tabActivity: {},
    activeTabId: null,
    activeSince: null,
    lastOrganizedAt: null,
    lastOrganizedOrder: [],
    focusStartedAt: active ? now : null,
    createdAt: now,
    updatedAt: now,
  };
}

async function readSessions() {
  const result = await chrome.storage.local.get(SESSIONS_KEY);
  const raw = result[SESSIONS_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const sessions = {};
  for (const [key, value] of Object.entries(raw)) {
    const windowId = Number(key);
    if (!Number.isFinite(windowId)) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      sessions[windowId] = value;
    }
  }
  return sessions;
}

async function writeSessions(sessions) {
  await chrome.storage.local.set({ [SESSIONS_KEY]: sessions });
}

let sessionMutationQueue = Promise.resolve();
function withSessionMutation(task) {
  const result = sessionMutationQueue.then(task, task);
  sessionMutationQueue = result.then(
    () => {},
    () => {}
  );
  return result;
}

async function getSession(windowId) {
  if (windowId == null) return null;
  const sessions = await readSessions();
  return sessions[windowId] || null;
}

async function isNormalWindow(windowId) {
  if (typeof windowId !== "number") return false;
  try {
    const win = await chrome.windows.get(windowId);
    return Boolean(win && win.type === "normal");
  } catch (err) {
    return false;
  }
}

async function isWebsiteOwnedWindow(windowId) {
  if (typeof windowId !== "number") return false;
  return websiteOwnedWindows.has(windowId);
}

function markWebsiteOwnedIfNewWindow(tab) {
  if (tab == null || typeof tab.id !== "number" || typeof tab.windowId !== "number") return;
  if (typeof tab.openerTabId !== "number") return;
  const created = recentlyCreatedWindows.get(tab.windowId);
  if (created == null) return;
  if (Date.now() - created > 4000) return;
  websiteOwnedWindows.add(tab.windowId);
  recentlyCreatedWindows.delete(tab.windowId);
}

async function isEligibleWindow(windowId) {
  if (!(await isNormalWindow(windowId))) return false;
  if (await isWebsiteOwnedWindow(windowId)) return false;
  return true;
}

let activeWindowsReadyPromise = null;
function ensureActiveWindowsReady() {
  if (!activeWindowsReadyPromise) {
    activeWindowsReadyPromise = refreshActiveWindows().catch(() => {});
  }
  return activeWindowsReadyPromise;
}

async function updateSession(windowId, patch) {
  return withSessionMutation(async () => {
    const sessions = await readSessions();
    let current = sessions[windowId];
    if (!current) {
      if (!(await isEligibleWindow(windowId))) return null;
      current = makeSession();
    }
    const next = {
      ...current,
      ...(patch && typeof patch === "object" ? patch : {}),
      updatedAt: Date.now(),
    };
    sessions[windowId] = next;
    await writeSessions(sessions);
    return next;
  });
}

async function patchSessionIfExists(windowId, patch) {
  return withSessionMutation(async () => {
    const sessions = await readSessions();
    const current = sessions[windowId];
    if (!current) return null;
    const next = {
      ...current,
      ...(patch && typeof patch === "object" ? patch : {}),
      updatedAt: Date.now(),
    };
    sessions[windowId] = next;
    await writeSessions(sessions);
    return next;
  });
}

async function removeSession(windowId) {
  return withSessionMutation(async () => {
    const sessions = await readSessions();
    if (!(windowId in sessions)) return;
    const current = sessions[windowId];
    delete sessions[windowId];
    await writeSessions(sessions);
    await recordCompletedSession(windowId, current);
  });
}

async function recordCompletedSession(windowId, session) {
  if (!session || typeof session !== "object") return null;
  const workflow = typeof session.workflow === "string" ? session.workflow.trim() : "";
  const activityKeys = Object.keys(session.tabActivity || {});
  const checklist = Array.isArray(session.checklist) ? session.checklist : [];
  if (
    session.active !== true &&
    !workflow &&
    activityKeys.length === 0 &&
    checklist.length === 0
  ) {
    return null;
  }
  const startedAt =
    typeof session.focusStartedAt === "number"
      ? session.focusStartedAt
      : typeof session.createdAt === "number"
        ? session.createdAt
        : Date.now();
  const endedAt = Date.now();
  const record = {
    id:
      typeof session.id === "string"
        ? session.id
        : `${windowId}-${startedAt}`,
    windowId,
    workflow,
    startedAt,
    endedAt,
    duration: Math.max(0, endedAt - startedAt),
    tabActivity:
      session.tabActivity && typeof session.tabActivity === "object"
        ? session.tabActivity
        : {},
  };
  const result = await chrome.storage.local.get(COMPLETED_KEY);
  const list = Array.isArray(result[COMPLETED_KEY])
    ? result[COMPLETED_KEY].slice()
    : [];
  list.push(record);
  while (list.length > COMPLETED_SESSIONS_CAP) list.shift();
  await chrome.storage.local.set({ [COMPLETED_KEY]: list });
  return record;
}

async function refreshActiveWindows() {
  const sessions = await readSessions();
  const next = new Set(
    Object.keys(sessions)
      .map((key) => Number(key))
      .filter((windowId) => Number.isFinite(windowId))
      .filter((windowId) => sessions[windowId] && sessions[windowId].active === true)
  );
  const changed =
    next.size !== activeWindows.size ||
    [...next].some((windowId) => !activeWindows.has(windowId)) ||
    [...activeWindows].some((windowId) => !next.has(windowId));
  activeWindows = next;
  if (changed) {
    syncActionIcons(sessions).catch(() => {});
  }
}

function isActiveWindow(windowId) {
  return activeWindows.has(windowId);
}

async function sweepStaleSessions() {
  const sessions = await readSessions();
  const sessionKeys = Object.keys(sessions);
  if (sessionKeys.length === 0) return;

  let openWindows = [];
  try {
    openWindows = await chrome.windows.getAll();
  } catch (err) {
    return;
  }
  const openIds = new Set(
    (openWindows || [])
      .map((win) => Number(win.id))
      .filter((windowId) => Number.isFinite(windowId))
  );

  let changed = false;
  for (const key of sessionKeys) {
    if (!openIds.has(Number(key))) {
      const stale = sessions[key];
      delete sessions[key];
      changed = true;
      if (stale && typeof stale === "object") {
        recordCompletedSession(Number(key), stale).catch(() => {});
      }
    }
  }
  if (changed) await writeSessions(sessions);
}

async function seedSessionsAndBaseline() {
  let windows = [];
  try {
    windows = await chrome.windows.getAll({ populate: true });
  } catch (err) {
    return;
  }
  if (!Array.isArray(windows)) return;

  const sessions = await readSessions();
  let changed = false;

  for (const win of windows) {
    if (!win || typeof win.id !== "number" || win.type !== "normal") continue;
    if (await isWebsiteOwnedWindow(win.id)) continue;
    if (!sessions[win.id]) {
      sessions[win.id] = makeSession();
      changed = true;
    }
    const tabs = Array.isArray(win.tabs) ? win.tabs : [];
    for (const tab of tabs) {
      if (!tab || typeof tab.id !== "number") continue;
      setTabUrl(tab.id, tab.url || tab.pendingUrl || "");
      if (tab.active === true) {
        lastActiveTabInWindow.set(win.id, tab.id);
      }
    }
  }

  if (changed) await writeSessions(sessions);
}

async function migrateLegacyWorkflow() {
  const result = await chrome.storage.local.get([LEGACY_STORAGE_KEY, MIGRATED_KEY]);
  if (result[MIGRATED_KEY]) return false;

  const legacy = result[LEGACY_STORAGE_KEY];
  if (typeof legacy === "string" && legacy.trim()) {
    const sessions = await readSessions();

    let targetWindowId = null;

    try {
      const focusedWindow = await chrome.windows.getLastFocused();
      if (
        focusedWindow &&
        typeof focusedWindow.id === "number" &&
        !sessions[focusedWindow.id]
      ) {
        targetWindowId = focusedWindow.id;
      }
    } catch (err) {
      // Fall through to the generic window scan.
    }

    if (targetWindowId == null) {
      let openWindows = [];
      try {
        openWindows = await chrome.windows.getAll();
      } catch (err) {
        openWindows = [];
      }
      const candidate =
        openWindows.find((win) => win.type === "normal") || openWindows[0];
      if (candidate && typeof candidate.id === "number" && !sessions[candidate.id]) {
        targetWindowId = candidate.id;
      }
    }

    if (targetWindowId != null) {
      await updateSession(targetWindowId, {
        active: true,
        workflow: legacy.trim(),
        checklist: [],
        focusStartedAt: Date.now(),
      });
    }
  }

  await chrome.storage.local.set({ [MIGRATED_KEY]: true });
  await chrome.storage.local.remove(LEGACY_STORAGE_KEY);
  return true;
}

async function getSavedTabs() {
  const result = await chrome.storage.local.get(SAVED_KEY);
  return Array.isArray(result[SAVED_KEY]) ? result[SAVED_KEY] : [];
}

async function setSavedTabs(tabs) {
  await chrome.storage.local.set({ [SAVED_KEY]: tabs });
}

async function addSavedTab(item) {
  const tabs = await getSavedTabs();
  tabs.push(item);
  if (tabs.length > MAX_SAVED_TABS) {
    tabs.splice(0, tabs.length - MAX_SAVED_TABS);
  }
  await setSavedTabs(tabs);
}

function cancelScheduledClose(tabId) {
  const timer = closeTimers.get(tabId);
  if (timer) {
    clearTimeout(timer);
    closeTimers.delete(tabId);
  }
}

function clearTabTracking(tabId) {
  cancelScheduledClose(tabId);
  pendingTabs.delete(tabId);
  freshTabs.delete(tabId);
  newTabs.delete(tabId);
  promptedTabs.delete(tabId);
  persistTrackingStateSoon();
}

function clearWindowEnforcement(windowId, reason) {
  const affectedTabIds = new Set();
  for (const [tabId, ownerWindowId] of freshTabs) {
    if (ownerWindowId === windowId) affectedTabIds.add(tabId);
  }
  for (const [tabId, ownerWindowId] of pendingTabs) {
    if (ownerWindowId === windowId) affectedTabIds.add(tabId);
  }
  affectedTabIds.forEach((tabId) => clearTabTracking(tabId));
  resetChain(windowId, reason || "window closed");
}

function scheduleAutoClose(tabId, windowId) {
  cancelScheduledClose(tabId);
  closeTimers.set(
    tabId,
    setTimeout(async () => {
      closeTimers.delete(tabId);
      if (!pendingTabs.has(tabId) && !freshTabs.has(tabId)) return;

      const session = await getSession(windowId);
      if (!session || session.active !== true) {
        clearTabTracking(tabId);
        return;
      }

      const settings = await getSettings();
      if (!settings.enforceTabs) {
        pendingTabs.delete(tabId);
        freshTabs.delete(tabId);
        clearTabTracking(tabId);
        return;
      }

      pendingTabs.delete(tabId);
      freshTabs.delete(tabId);
      persistTrackingStateSoon();
      chrome.tabs.remove(tabId).catch(() => {});
    }, AUTO_CLOSE_GRACE_MS)
  );
}

function isAbandonable(tabId) {
  return pendingTabs.has(tabId) || freshTabs.has(tabId);
}

function getChain(windowId) {
  let chain = chains.get(windowId);
  if (!chain) {
    chain = { originTabId: null, visited: new Set(), startedAt: 0 };
    chains.set(windowId, chain);
  }
  return chain;
}

function resetChain(windowId, reason) {
  chains.delete(windowId);
}

function addChainVisit(windowId, tabId) {
  const chain = getChain(windowId);
  if (chain.originTabId == null || tabId === chain.originTabId) return;
  if (freshTabs.has(tabId) || pendingTabs.has(tabId)) return;

  const known = tabUrls.get(tabId);
  if (known && known.web) {
    if (!chain.visited.has(tabId)) {
      chain.visited.add(tabId);
    }
    return;
  }

  chrome.tabs
    .get(tabId)
    .then((tab) => {
      const live = getChain(windowId);
      if (live.originTabId == null || tabId === live.originTabId) return;
      const url = tab && tab.url;
      if (!isUsableWebUrl(url)) return;
      if (isUnusedFreshUrl(url)) return;
      if (freshTabs.has(tabId) || pendingTabs.has(tabId)) return;
      setTabUrl(tabId, url);
      if (!live.visited.has(tabId)) {
        live.visited.add(tabId);
      }
    })
    .catch(() => {});
}

function trackChain(windowId, previousId, currentId) {
  if (windowId == null || !isActiveWindow(windowId)) return null;
  if (previousId == null || previousId === currentId) return null;
  if (freshTabs.has(previousId) || pendingTabs.has(previousId)) return null;
  if (!tabIsWeb(previousId)) return null;

  const chain = getChain(windowId);

  if (chain.originTabId != null) {
    if (currentId === chain.originTabId) {
      let event = null;
      if (chain.visited.size >= CHAIN_MIN_DISTINCT_TABS) {
        event = {
          windowId,
          originTabId: chain.originTabId,
          visitedTabIds: Array.from(chain.visited),
          startedAt: chain.startedAt,
          detectedAt: Date.now(),
        };
        lastChainEvent = event;
        chainEvents.push(event);
        if (chainEvents.length > MAX_CHAIN_EVENTS) chainEvents.shift();
      }
      resetChain(windowId, "returned to origin");
      return event;
    }
    addChainVisit(windowId, currentId);
    return null;
  }

  chain.originTabId = previousId;
  chain.startedAt = Date.now();
  addChainVisit(windowId, currentId);
  return null;
}

async function sendToTab(tabId, message) {
  for (let attempt = 0; attempt < MAX_PROMPT_SEND_ATTEMPTS; attempt++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      if (response && response.ok) return true;
    } catch (err) {
      // Content script not ready yet; retry.
    }
    await new Promise((resolve) => setTimeout(resolve, PROMPT_SEND_RETRY_MS));
  }
  return false;
}

async function sendPrompt(tabId, workflow, windowId) {
  const ok = await sendToTab(tabId, { type: "LOCKED_IN_SHOW", workflow });
  if (!ok) return;
  if (!isActiveWindow(windowId)) return;
  pendingTabs.set(tabId, windowId);
  persistTrackingStateSoon();
}

async function showPrompt(tabId, windowId) {
  if (promptedTabs.has(tabId)) return;
  promptedTabs.add(tabId);
  persistTrackingStateSoon();

  if (!isActiveWindow(windowId)) {
    promptedTabs.delete(tabId);
    persistTrackingStateSoon();
    return;
  }

  const session = await getSession(windowId);
  if (!session || session.active !== true) {
    promptedTabs.delete(tabId);
    persistTrackingStateSoon();
    return;
  }

  const workflow = session.workflow || "";

  newTabs.delete(tabId);
  persistTrackingStateSoon();
  const ok = await sendPrompt(tabId, workflow, windowId);
  if (!ok) {
    promptedTabs.delete(tabId);
    newTabs.add(tabId);
    persistTrackingStateSoon();
  }
}

async function getWorkflowTabs(windowId) {
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ windowId });
  } catch (err) {
    return [];
  }
  return tabs.filter((tab) => {
    if (tab.id == null) return false;
    const url = tab.url || tab.pendingUrl || "";
    if (!isUsableWebUrl(url)) return false;
    if (isUnusedFreshUrl(url)) return false;
    if (pendingTabs.has(tab.id) || freshTabs.has(tab.id)) return false;
    return true;
  });
}

function getActivityFor(session, tabId) {
  const activity = session && session[ACTIVITY_KEY];
  const rec = activity && activity[tabId];
  return rec && typeof rec === "object"
    ? rec
    : { visits: 0, activeMs: 0, firstSeenAt: 0, lastActiveAt: 0, workflow: "" };
}

function computeActivityScore(session, tabId, now) {
  const rec = getActivityFor(session, tabId);
  let activeMs = typeof rec.activeMs === "number" ? rec.activeMs : 0;
  if (
    session &&
    session.activeTabId === tabId &&
    typeof session.activeSince === "number"
  ) {
    activeMs += Math.max(0, now - session.activeSince);
  }
  const visitMs = (typeof rec.visits === "number" ? rec.visits : 0) *
    ORGANIZE_ACTIVITY_WEIGHT_VISIT_MS;
  const cappedActiveMs = Math.min(
    activeMs,
    ORGANIZE_ACTIVITY_WEIGHT_RECENCY_MS
  );
  let recencyMs = 0;
  const lastActive = typeof rec.lastActiveAt === "number" ? rec.lastActiveAt : 0;
  if (lastActive > 0) {
    const idle = Math.max(0, now - lastActive);
    if (idle < ORGANIZE_ACTIVITY_RECENCY_WINDOW_MS) {
      recencyMs =
        (1 - idle / ORGANIZE_ACTIVITY_RECENCY_WINDOW_MS) *
        ORGANIZE_ACTIVITY_WEIGHT_RECENCY_MS;
    }
  }
  return visitMs + cappedActiveMs + recencyMs;
}

function sameOrder(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function orderDistance(current, target) {
  const position = new Map();
  target.forEach((id, index) => {
    position.set(id, index);
  });
  let max = 0;
  current.forEach((id, index) => {
    const targetIndex = position.get(id);
    if (targetIndex == null) return;
    max = Math.max(max, Math.abs(index - targetIndex));
  });
  return max;
}

function desiredTabOrder(session, tabs, now) {
  const byScore = (tab) => computeActivityScore(session, tab.id, now);
  const audible = tabs.filter((tab) => tab.audible === true);
  const silent = tabs.filter((tab) => tab.audible !== true).slice();
  const order = new Map(silent.map((tab) => [tab.id, byScore(tab)]));
  silent.sort((a, b) => {
    const diff = order.get(b.id) - order.get(a.id);
    return diff !== 0 ? diff : a.id - b.id;
  });
  return [
    ...audible.map((tab) => tab.id),
    ...silent.map((tab) => tab.id),
  ];
}

async function applyTabOrder(windowId, eligible, target) {
  const eligibleSet = new Set(target);
  let order = [];
  try {
    const tabs = await chrome.tabs.query({ windowId });
    order = tabs.map((tab) => tab.id);
  } catch (err) {
    return 0;
  }
  const slots = [];
  order.forEach((id, index) => {
    if (eligibleSet.has(id)) slots.push(index);
  });
  let moved = 0;
  for (let i = 0; i < target.length; i++) {
    const wantId = target[i];
    const currentIndex = order.indexOf(wantId);
    const slotIndex = slots[i];
    if (currentIndex === slotIndex) continue;
    if (currentIndex < 0 || slotIndex < 0) continue;
    try {
      await chrome.tabs.move(wantId, { index: slotIndex });
      moved++;
    } catch (err) {
      continue;
    }
    order.splice(currentIndex, 1);
    order.splice(slotIndex, 0, wantId);
    slots.length = 0;
    order.forEach((id, index) => {
      if (eligibleSet.has(id)) slots.push(index);
    });
  }
  return moved;
}

async function organizeTabs(windowId, options = {}) {
  const session = await getSession(windowId);
  if (!session || session.active !== true) {
    return { moved: 0, status: "inactive" };
  }

  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ windowId });
  } catch (err) {
    return { moved: 0, status: "query-failed" };
  }
  const eligible = tabs.filter(
    (tab) =>
      tab.id != null &&
      tab.pinned !== true &&
      pendingTabs.has(tab.id) === false &&
      freshTabs.has(tab.id) === false &&
      isUsableWebUrl(tab.url || tab.pendingUrl || "")
  );
  if (eligible.length < 2) {
    return { moved: 0, status: "too-few" };
  }

  const current = eligible.map((tab) => tab.id);
  const target = desiredTabOrder(session, eligible, Date.now());
  if (sameOrder(current, target)) {
    return { moved: 0, status: "already" };
  }

  const forced = options && options.force === true;
  if (!forced) {
    const distance = orderDistance(current, target);
    if (distance <= ORGANIZE_HYSTERESIS_DEADBAND) {
      return { moved: 0, status: "hysteresis" };
    }
    if (typeof session.lastOrganizedAt === "number") {
      const elapsed = Date.now() - session.lastOrganizedAt;
      if (elapsed >= 0 && elapsed < ORGANIZE_COOLDOWN_MS) {
        return { moved: 0, status: "cooldown" };
      }
    }
  }

  const moved = await applyTabOrder(windowId, eligible, target);
  if (moved > 0) {
    await updateSession(windowId, {
      lastOrganizedAt: Date.now(),
      lastOrganizedOrder: target,
    });
  }
  return { moved, status: moved > 0 ? "applied" : "unchanged" };
}

async function recordActivation(windowId, tabId) {
  if (windowId == null || tabId == null) return;
  const session = await getSession(windowId);
  if (!session) return;

  const now = Date.now();
  const activity = session[ACTIVITY_KEY] || {};
  const activeTabId = session.activeTabId;
  if (
    activeTabId != null &&
    activeTabId !== tabId &&
    typeof session.activeSince === "number"
  ) {
    const previous = activity[activeTabId] || {};
    activity[activeTabId] = {
      ...previous,
      visits: previous.visits || 0,
      activeMs:
        (previous.activeMs || 0) + Math.max(0, now - session.activeSince),
      firstSeenAt: previous.firstSeenAt || now,
      lastActiveAt: now,
      workflow: typeof session.workflow === "string" ? session.workflow : "",
    };
  }

  const rec = activity[tabId] || {};
  activity[tabId] = {
    ...rec,
    visits: (rec.visits || 0) + 1,
    activeMs: rec.activeMs || 0,
    firstSeenAt: rec.firstSeenAt || now,
    lastActiveAt: now,
    workflow: typeof session.workflow === "string" ? session.workflow : "",
  };

  await patchSessionIfExists(windowId, {
    [ACTIVITY_KEY]: activity,
    activeTabId: tabId,
    activeSince: now,
  });
}

async function flushActiveMs(windowId) {
  if (windowId == null) return;
  const session = await getSession(windowId);
  if (!session) return;
  const activeTabId = session.activeTabId;
  if (
    activeTabId == null ||
    typeof session.activeSince !== "number" ||
    session.active === false
  ) {
    if (session.active !== true) {
      await patchSessionIfExists(windowId, { activeSince: null });
    }
    return;
  }
  const now = Date.now();
  const activity = session[ACTIVITY_KEY] || {};
  const rec = activity[activeTabId] || {};
  activity[activeTabId] = {
    ...rec,
    visits: rec.visits || 0,
    activeMs: (rec.activeMs || 0) + Math.max(0, now - session.activeSince),
    firstSeenAt: rec.firstSeenAt || now,
    lastActiveAt: now,
    workflow: typeof session.workflow === "string" ? session.workflow : "",
  };
  await patchSessionIfExists(windowId, {
    [ACTIVITY_KEY]: activity,
    activeSince: null,
  });
}

let lastFocusedWindowId = null;
const organizeTimer = new Map();
async function scheduleOrganize(windowId) {
  const settings = await getSettings();
  if (!settings.organizeTabs) return;
  const existing = organizeTimer.get(windowId);
  if (existing !== undefined) {
    clearTimeout(existing);
  }
  organizeTimer.set(
    windowId,
    setTimeout(() => {
      organizeTimer.delete(windowId);
      getSettings()
        .then((currentSettings) => {
          if (currentSettings.organizeTabs) {
            return organizeTabs(windowId);
          }
          return null;
        })
        .catch((err) => {
          console.error("Locked In: organizeTabs failed", err);
        });
    }, ORGANIZE_COOLDOWN_MS)
  );
}

function cleanupTabData(tab) {
  return {
    tabId: tab.id,
    title: tab.title || tab.url || "Untitled tab",
    url: tab.url || "",
    hostname: hostnameFor(tab.url),
  };
}

async function maybePresentCleanup(windowId) {
  const session = await getSession(windowId);
  if (!session || session.active !== true) return;
  if (typeof session.lastCleanupChainAt !== "number") return;

  let devBypass = false;
  try {
    const result = await chrome.storage.local.get(DEV_BYPASS_CLEANUP_KEY);
    devBypass = result[DEV_BYPASS_CLEANUP_KEY] === true;
  } catch (err) {
    devBypass = false;
  }

  const settings = await getSettings();
  const cleanupMinutes =
    Number.isFinite(settings.cleanupFrequency) && settings.cleanupFrequency >= 0
      ? settings.cleanupFrequency
      : 30;
  const cleanupCooldownMs = cleanupMinutes * 60 * 1000;

  if (!devBypass) {
    const now = Date.now();
    if (typeof session.lastCleanupPromptAt === "number") {
      if (now - session.lastCleanupPromptAt < cleanupCooldownMs) return;
      if (session.lastCleanupChainAt <= session.lastCleanupPromptAt) return;
    }
  }

  const tabs = await getWorkflowTabs(windowId);
  if (tabs.length < MIN_CLEANUP_TABS) return;

  let active = null;
  try {
    const list = await chrome.tabs.query({ active: true, windowId });
    active = list[0] || null;
  } catch (err) {
    return;
  }
  if (!active || active.id == null) return;
  if (!isUsableWebUrl(active.url || "")) return;
  if (pendingTabs.has(active.id) || freshTabs.has(active.id)) return;

  const others = tabs.filter((tab) => tab.id !== active.id);
  const shown = others.slice(0, CLEANUP_MAX_VISIBLE_TABS).map(cleanupTabData);
  await updateSession(windowId, { lastCleanupPromptAt: Date.now() });

  const ok = await sendToTab(active.id, {
    type: "LI_CLEANUP_SHOW",
    workflow: session.workflow || "",
    tabs: shown,
    extraTabs: others.length - shown.length,
    activeTabId: active.id,
  });
  if (!ok) {
    await updateSession(windowId, { lastCleanupPromptAt: null });
  }
}

async function closeCleanupTabs(windowId, tabIds, excludeTabId) {
  const ids = Array.isArray(tabIds)
    ? tabIds.filter((id) => Number.isInteger(id))
    : [];
  const closed = [];
  for (const id of ids) {
    if (id === excludeTabId) continue;
    let tab = null;
    try {
      tab = await chrome.tabs.get(id);
    } catch (err) {
      continue;
    }
    if (!tab || tab.id == null) continue;
    if (tab.windowId !== windowId) continue;
    if (!isUsableWebUrl(tab.url || "")) continue;
    if (isUnusedFreshUrl(tab.url || "")) continue;
    try {
      await chrome.tabs.remove(tab.id);
      closed.push(tab.id);
    } catch (err) {
      // Tab already gone; nothing to clean up.
    }
  }
  return closed;
}

async function handleSaveForLater(tab) {
  try {
    const windowId = tab.windowId;
    const session = windowId != null ? await getSession(windowId) : null;
    const workflow = session && session.workflow ? session.workflow : "";
    const item = {
      id: randomId(),
      title: tab.title || tab.url || "Untitled tab",
      url: tab.url || "",
      savedAt: Date.now(),
      workflow,
    };
    await addSavedTab(item);
    clearTabTracking(tab.id);
    try {
      await chrome.tabs.remove(tab.id);
    } catch (err) {
      // Tab already gone; nothing to clean up.
    }
    return true;
  } catch (err) {
    console.error("Locked In: failed to save tab for later", err);
    return false;
  }
}

async function handleOpenSaved(itemId) {
  if (!itemId) return false;
  const tabs = await getSavedTabs();
  const index = tabs.findIndex((item) => item && item.id === itemId);
  if (index === -1) return true;

  const item = tabs[index];
  if (typeof item.url !== "string" || !item.url) return false;

  let created = false;
  try {
    const newTab = await chrome.tabs.create({ url: item.url });
    created = Boolean(newTab && newTab.id != null);
  } catch (err) {
    console.error("Locked In: failed to create saved tab", err);
    return false;
  }

  if (created) {
    try {
      const updated = await getSavedTabs();
      await setSavedTabs(updated.filter((existing) => existing.id !== itemId));
    } catch (err) {
      console.error("Locked In: failed to remove saved tab after opening", err);
    }
  }
  return created;
}

function handleTabRemoved(tabId) {
  tabUrls.delete(tabId);
  newTabs.delete(tabId);
  promptedTabs.delete(tabId);
  clearTabTracking(tabId);
  for (const [windowId, chain] of chains) {
    chain.visited.delete(tabId);
    if (chain.originTabId === tabId) {
      resetChain(windowId, "origin closed");
    }
  }
}

chrome.windows.onCreated.addListener((win) => {
  if (!win || typeof win.id !== "number" || win.type !== "normal") return;
  recentlyCreatedWindows.set(win.id, Date.now());
  ensureActiveWindowsReady()
    .then(() => isWebsiteOwnedWindow(win.id))
    .then((owned) => {
      if (owned) return null;
      return withSessionMutation(async () => {
        const sessions = await readSessions();
        if (sessions[win.id]) return sessions[win.id];
        sessions[win.id] = makeSession();
        await writeSessions(sessions);
        return sessions[win.id];
      });
    })
    .catch(() => {});
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id == null || tab.windowId == null) return;
  markWebsiteOwnedIfNewWindow(tab);
  const url = tab.url || tab.pendingUrl || "";
  setTabUrl(tab.id, url);

  if (activeWindowsReadyPromise != null) {
    if (!isActiveWindow(tab.windowId)) return;
    newTabs.add(tab.id);
    persistTrackingStateSoon();
    if (isUsableWebUrl(url)) {
      showPrompt(tab.id, tab.windowId).catch(() => {});
    } else {
      freshTabs.set(tab.id, tab.windowId);
      persistTrackingStateSoon();
    }
    return;
  }

  newTabs.add(tab.id);
  persistTrackingStateSoon();
  ensureActiveWindowsReady()
    .then(async () => {
      if (isActiveWindow(tab.windowId)) {
        let currentUrl = url;
        try {
          const live = await chrome.tabs.get(tab.id);
          currentUrl = (live && (live.url || live.pendingUrl || "")) || url;
        } catch (err) {
          // Tab may have closed; fall back to the captured url.
        }
        if (isUsableWebUrl(currentUrl)) {
          showPrompt(tab.id, tab.windowId).catch(() => {});
        } else if (!freshTabs.has(tab.id)) {
          freshTabs.set(tab.id, tab.windowId);
          persistTrackingStateSoon();
        }
      } else {
        freshTabs.delete(tab.id);
        newTabs.delete(tab.id);
        promptedTabs.delete(tab.id);
        persistTrackingStateSoon();
      }
    })
    .catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.windowId == null) return;

  const url = tab.url || changeInfo.url || "";
  setTabUrl(tabId, url);

  if (typeof changeInfo.audible === "boolean") {
    getSettings()
      .then((settings) => {
        if (settings.organizeTabs) {
          return organizeTabs(tab.windowId, { force: true });
        }
        return null;
      })
      .catch((err) => {
        console.error("Locked In: audio organization failed", err);
      });
  }

  if (!newTabs.has(tabId)) return;

  if (isUsableWebUrl(url)) {
    freshTabs.delete(tabId);
    persistTrackingStateSoon();
    if (changeInfo.status === "complete") {
      showPrompt(tabId, tab.windowId).catch(() => {});
    }
  } else if (!isUnusedFreshUrl(url)) {
    freshTabs.delete(tabId);
    persistTrackingStateSoon();
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  handleTabRemoved(tabId);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  const { tabId, windowId } = activeInfo;

  lastActiveTabInWindow.set(windowId, tabId);
  cancelScheduledClose(tabId);

  const previous = lastActivated;
  lastActivated = { tabId, windowId };

  recordActivation(windowId, tabId)
    .then(() => {
      if (previous && previous.windowId != null && previous.windowId !== windowId) {
        return flushActiveMs(previous.windowId);
      }
      return null;
    })
    .catch((err) => {
      console.error("Locked In: activity tracking failed", err);
    });

  scheduleOrganize(windowId);

  if (
    previous &&
    previous.tabId !== tabId &&
    isAbandonable(previous.tabId) &&
    isActiveWindow(previous.windowId)
  ) {
    scheduleAutoClose(previous.tabId, previous.windowId);
  }

  if (previous && previous.windowId !== windowId) {
    if (previous.windowId != null) {
      lastActiveTabInWindow.set(previous.windowId, previous.tabId);
      resetChain(previous.windowId, "cross-window");
    }
    resetChain(windowId, "cross-window");
    return;
  }

  const previousIdInWindow = previous
    ? previous.tabId
    : lastActiveTabInWindow.get(windowId) ?? null;

  const event = trackChain(windowId, previousIdInWindow, tabId);
  if (event) {
    updateSession(windowId, { lastCleanupChainAt: Date.now() })
      .then(() => maybePresentCleanup(windowId))
      .catch((err) => {
        console.error("Locked In: cleanup eligibility failed", err);
      });
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  websiteOwnedWindows.delete(windowId);
  recentlyCreatedWindows.delete(windowId);
  clearWindowEnforcement(windowId);
  removeSession(windowId).catch(() => {});
});

chrome.windows.onFocusChanged.addListener((focusedWindowId) => {
  if (lastFocusedWindowId != null && lastFocusedWindowId !== focusedWindowId) {
    flushActiveMs(lastFocusedWindowId).catch(() => {});
  }
  lastFocusedWindowId = focusedWindowId;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[SETTINGS_KEY]) {
    settingsCache = null;
  }
  if (changes[SESSIONS_KEY]) {
    refreshActiveWindows().catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  switch (message.type) {
    case "LOCKED_IN_KEEP":
      if (sender.tab) clearTabTracking(sender.tab.id);
      sendResponse({ ok: true });
      break;

    case "LOCKED_IN_CLOSE_TAB":
      if (sender.tab) {
        clearTabTracking(sender.tab.id);
        chrome.tabs.remove(sender.tab.id).catch(() => {});
      }
      sendResponse({ ok: true });
      break;

    case "LOCKED_IN_SAVE_FOR_LATER":
      if (!sender.tab) {
        sendResponse({ ok: false });
        break;
      }
      handleSaveForLater(sender.tab)
        .then((ok) => sendResponse({ ok }))
        .catch((err) => {
          console.error("Locked In: save-for-later failed", err);
          sendResponse({ ok: false });
        });
      return true;

    case "LOCKED_IN_OPEN_SAVED":
      handleOpenSaved(message.itemId)
        .then((ok) => sendResponse({ ok }))
        .catch((err) => {
          console.error("Locked In: open saved tab failed", err);
          sendResponse({ ok: false });
        });
      return true;

    case "LI_SESSION_UPDATED": {
      const windowId = Number(message.windowId);
      if (!Number.isFinite(windowId)) {
        sendResponse({ ok: false });
        break;
      }
      refreshActiveWindows()
        .then(() => {
          if (message.active === false) {
            clearWindowEnforcement(windowId, "enforcement off");
            return flushActiveMs(windowId).then(() =>
              getSession(windowId).then((current) =>
                recordCompletedSession(windowId, current)
              )
            );
          }
          if (message.active === true) {
            return scheduleOrganize(windowId);
          }
          return null;
        })
        .then(() => sendResponse({ ok: true }))
        .catch((err) => {
          console.error("Locked In: session update failed", err);
          sendResponse({ ok: false });
        });
      return true;
    }

    case "LI_END_SESSION": {
      const windowId = Number(message.windowId);
      if (!Number.isFinite(windowId)) {
        sendResponse({ ok: false });
        break;
      }
      refreshActiveWindows()
        .then(() => {
          clearWindowEnforcement(windowId, "end session");
          return flushActiveMs(windowId).then(() =>
            updateSession(windowId, { active: false, focusStartedAt: null })
              .then((ended) => recordCompletedSession(windowId, ended))
          );
        })
        .then(() => sendResponse({ ok: true }))
        .catch((err) => {
          console.error("Locked In: end session failed", err);
          sendResponse({ ok: false });
        });
      return true;
    }

    case "LI_SYNC_ICONS":
      refreshActiveWindows()
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;

    case "LI_CONTENT_READY": {
      if (!sender.tab) {
        sendResponse({ ok: false });
        break;
      }
      if (newTabs.has(sender.tab.id)) {
        showPrompt(sender.tab.id, sender.tab.windowId).catch(() => {});
      }
      sendResponse({ ok: true });
      break;
    }

    case "LI_CLEANUP_CLOSE": {
      if (!sender.tab) {
        sendResponse({ ok: true, closed: [] });
        break;
      }
      closeCleanupTabs(sender.tab.windowId, message.tabIds, sender.tab.id)
        .then((closed) => sendResponse({ ok: true, closed }))
        .catch((err) => {
          console.error("Locked In: cleanup close failed", err);
          sendResponse({ ok: true, closed: [] });
        });
      return true;
    }

    case "LI_CLEANUP_DISMISS":
      sendResponse({ ok: true });
      break;
  }
});

(async () => {
  try {
    await migrateLegacyWorkflow();
    await seedSessionsAndBaseline();
    await refreshActiveWindows();
    await sweepStaleSessions();
    await refreshActiveWindows();
  } catch (err) {
    console.error("Locked In: bootstrap failed", err);
  }
})();
