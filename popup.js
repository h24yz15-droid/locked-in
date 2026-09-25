const SESSIONS_KEY = "li_sessions";
const MIGRATED_KEY = "li_migrated";
const LEGACY_STORAGE_KEY = "currentWorkflow";
const SAVED_KEY = "savedTabs";
const DEV_BYPASS_CLEANUP_KEY = "li_dev_bypass_cleanup_cooldown";
const SETTINGS_KEY = "li_settings";
const THEME_KEY = "li_theme";
const SETTINGS_DEFAULTS = {
  focusTimer: true,
  enforceTabs: true,
  organizeTabs: true,
  cleanupFrequency: 30,
};

const form = document.getElementById("workflow-form");
const input = document.getElementById("workflow-input");
const saveButton = document.getElementById("save-button");
const confirmation = document.getElementById("confirmation");
const toggleButton = document.getElementById("toggle-button");
const sessionState = document.getElementById("session-state");
const sessionHint = document.getElementById("session-hint");
const sessionDot = document.getElementById("session-dot");
const sessionCard = document.getElementById("session-card");
const headerSessionState = document.getElementById("header-session-state");
const headerSessionPill = document.getElementById("header-session-pill");
const focusTime = document.getElementById("focus-time");
const checklistForm = document.getElementById("checklist-form");
const checklistInput = document.getElementById("checklist-input");
const checklistAdd = document.getElementById("checklist-add");
const checklistProgress = document.getElementById("checklist-progress");
const checklistList = document.getElementById("checklist-list");
const devBypassInput = document.getElementById("dev-bypass");
const savedList = document.getElementById("saved-list");
const savedEmpty = document.getElementById("saved-empty");
const savedCount = document.getElementById("saved-count");
const focusTimerInput = document.getElementById("focus-timer");
const enforceTabsInput = document.getElementById("enforce-tabs-checkbox");
const organizeTabsInput = document.getElementById("organize-tabs-checkbox");
const cleanupFrequencySelect = document.getElementById("cleanup-frequency-select");
const endSessionButton = document.getElementById("end-session-button");
const masterSwitch = document.getElementById("master-switch");
const masterToggle = document.getElementById("master-toggle");
const masterSub = document.getElementById("master-sub");
const darkModeToggle = document.getElementById("dark-mode-toggle");
const headerSettingsBtn = document.getElementById("header-settings");
const viewTimerBtn = document.getElementById("view-timer-btn");
const timerTime = document.getElementById("timer-time");
const timerWorkflow = document.getElementById("timer-workflow");
const timerBadgeText = document.getElementById("timer-badge-text");
const statOpen = document.getElementById("stat-open");
const statSaved = document.getElementById("stat-saved");
const statChecklist = document.getElementById("stat-checklist");
const appBanner = document.getElementById("app-banner");
const appBannerText = document.getElementById("app-banner-text");

const MAIN_ICON = "main-icon.png";
const LOCKED_ICON = "locked-icon.png";

function getBrandIconUrl(active) {
  try {
    return chrome.runtime.getURL(active ? LOCKED_ICON : MAIN_ICON);
  } catch (err) {
    return active ? LOCKED_ICON : MAIN_ICON;
  }
}

function on(element, type, fn) {
  if (element) element.addEventListener(type, fn);
}

let settings = { ...SETTINGS_DEFAULTS };

let windowId = null;
let session = null;
let editingIndex = -1;
let confirmationTimeoutId = null;
let dragIndex = -1;
let focusClockTimerId = null;

function formatFocusDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function renderFocusTime() {
  if (focusClockTimerId != null) {
    clearInterval(focusClockTimerId);
    focusClockTimerId = null;
  }
  const active = Boolean(session && session.active);
  const started = session && typeof session.focusStartedAt === "number" ? session.focusStartedAt : null;
  if (!settings.focusTimer || !active || started == null) {
    if (focusTime) focusTime.textContent = "";
    if (timerTime) timerTime.textContent = "00:00";
    return;
  }
  const update = () => {
    const elapsed = formatFocusDuration(Date.now() - started);
    if (focusTime) focusTime.textContent = elapsed;
    if (timerTime) timerTime.textContent = elapsed;
  };
  update();
  focusClockTimerId = setInterval(update, 1000);
}

function randomId() {
  if (crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeSession({ active = false, workflow = "", checklist = [] } = {}) {
  const now = Date.now();
  return {
    id: randomId(),
    active,
    workflow: typeof workflow === "string" ? workflow : "",
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
  return raw;
}

function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return "Just now";

  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 60) return minutes === 1 ? "1 min ago" : `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hr ago" : `${hours} hrs ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function describeUrl(url) {
  try {
    return new URL(url).hostname || url;
  } catch (err) {
    return url;
  }
}

async function migrateLegacyWorkflow() {
  const result = await chrome.storage.local.get([LEGACY_STORAGE_KEY, MIGRATED_KEY]);
  if (result[MIGRATED_KEY]) return;

  const legacy = result[LEGACY_STORAGE_KEY];
  const sessions = await readSessions();
  if (typeof legacy === "string" && legacy.trim()) {
    if (windowId != null && !sessions[windowId]) {
      sessions[windowId] = makeSession({ active: true, workflow: legacy.trim() });
      await chrome.storage.local.set({ [SESSIONS_KEY]: sessions });
    }
  }

  await chrome.storage.local.set({ [MIGRATED_KEY]: true });
  await chrome.storage.local.remove(LEGACY_STORAGE_KEY);
}

async function persistSession(patch) {
  if (windowId == null) return null;
  const sessions = await readSessions();
  const current = sessions[windowId] || makeSession();
  const cleaned = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (value !== undefined) cleaned[key] = value;
  }
  const next = {
    ...current,
    ...cleaned,
    updatedAt: Date.now(),
  };
  sessions[windowId] = next;
  await chrome.storage.local.set({ [SESSIONS_KEY]: sessions });
  session = next;
  chrome.runtime
    .sendMessage({ type: "LI_SESSION_UPDATED", windowId, active: next.active })
    .catch(() => {});
  return next;
}

function showConfirmation() {
  if (!confirmation) return;
  confirmation.hidden = false;
  if (confirmationTimeoutId) {
    clearTimeout(confirmationTimeoutId);
  }
  confirmationTimeoutId = setTimeout(() => {
    confirmation.hidden = true;
  }, 2000);
}

function renderHeader() {
  const active = Boolean(session && session.active);
  if (headerSessionState) {
    headerSessionState.textContent = active ? "Locked in" : "Inactive";
  }
  if (headerSessionPill) {
    headerSessionPill.classList.toggle("is-active", active);
  }
  if (sessionCard) sessionCard.classList.toggle("is-active", active);
  if (masterSwitch) masterSwitch.classList.toggle("is-on", active);
  if (masterToggle) {
    masterToggle.classList.toggle("on", active);
    masterToggle.setAttribute("aria-checked", String(active));
  }
  if (masterSub) {
    masterSub.textContent = active
      ? "Active — staying focused"
      : "Paused — all tabs allowed";
  }
  if (timerBadgeText) {
    timerBadgeText.textContent = active ? "Focusing" : "Inactive";
    const badge = timerBadgeText.closest("span.timer-badge");
    if (badge) badge.classList.toggle("is-active", active);
  }
  const iconUrl = getBrandIconUrl(active);
  const brandIcon = document.getElementById("header-brand-icon");
  if (brandIcon) brandIcon.src = iconUrl;
  const masterMarkIcon = document.getElementById("master-mark-icon");
  if (masterMarkIcon) masterMarkIcon.src = iconUrl;
}

function updateTimerView() {
  const active = Boolean(session && session.active);
  const workflow = session && session.workflow ? session.workflow.trim() : "";
  if (timerWorkflow) {
    timerWorkflow.textContent = workflow ? workflow.toUpperCase() : "NO WORKFLOW";
    timerWorkflow.title = workflow || "";
  }
  renderFocusTime();
}

function renderSession() {
  const active = Boolean(session && session.active);
  if (sessionDot) sessionDot.classList.toggle("is-active", active);
  if (sessionState) sessionState.textContent = active ? "Locked in" : "Inactive";
  if (sessionHint) {
    sessionHint.textContent = active
      ? "New tabs will be checked against your workflow."
      : "Enforcement is off. Your workflow is kept.";
  }
  if (toggleButton) {
    toggleButton.textContent = active ? "Turn off" : "Turn on";
    toggleButton.classList.toggle("is-active", active);
  }
  if (input) input.value = session && session.workflow ? session.workflow : "";
  renderHeader();
  updateTimerView();
  renderChecklist();
}

function finishDrag() {
  dragIndex = -1;
  document
    .querySelectorAll(".drop-before, .drop-after")
    .forEach((el) => el.classList.remove("drop-before", "drop-after"));
}

function computeDropIndex(event, li, index) {
  const from = Number(event.dataTransfer.getData("text/plain"));
  if (!Number.isFinite(from) || from < 0 || from >= session.checklist.length) {
    return null;
  }
  const rect = li.getBoundingClientRect();
  const before = event.clientY < rect.top + rect.height / 2;
  let to = before ? index : index + 1;
  if (from < to) to -= 1;
  to = Math.max(0, Math.min(session.checklist.length - 1, to));
  if (to === from) return null;
  return to;
}

function commitEdit(index, value) {
  const text = String(value || "").trim();
  if (editingIndex !== index) return;
  editingIndex = -1;
  if (!text || !session) {
    renderChecklist();
    return;
  }
  const items = session.checklist.map((item, itemIndex) =>
    itemIndex === index ? { ...item, text } : item
  );
  persistSession({ checklist: items }).then(renderChecklist);
}

const GRIP_SVG =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="7" r="1.6"/><circle cx="15" cy="7" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="17" r="1.6"/><circle cx="15" cy="17" r="1.6"/></svg>';
const PENCIL_SVG =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
const TRASH_SVG =
  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';
const EXTERNAL_SVG =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

function buildChecklistItem(item, index) {
  const li = document.createElement("li");
  li.className = "checklist-item";
  li.classList.toggle("is-done", Boolean(item.completed));

  const grip = document.createElement("span");
  grip.className = "checklist-grip";
  grip.innerHTML = GRIP_SVG;
  grip.title = "Drag to reorder";
  grip.draggable = true;
  grip.addEventListener("dragstart", (event) => {
    dragIndex = index;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  });
  li.addEventListener("dragover", (event) => {
    if (dragIndex < 0 || dragIndex === index) return;
    event.preventDefault();
    const rect = li.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    li.classList.toggle("drop-before", before);
    li.classList.toggle("drop-after", !before);
  });
  li.addEventListener("dragleave", () => {
    li.classList.remove("drop-before", "drop-after");
  });
  li.addEventListener("drop", (event) => {
    if (dragIndex < 0) return;
    event.preventDefault();
    li.classList.remove("drop-before", "drop-after");
    const to = computeDropIndex(event, li, index);
    const from = dragIndex;
    finishDrag();
    if (to == null) return;
    const items = [...session.checklist];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    persistSession({ checklist: items }).then(renderChecklist);
  });
  li.addEventListener("dragend", finishDrag);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = Boolean(item.completed);
  checkbox.addEventListener("change", () => {
    const items = session.checklist.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, completed: checkbox.checked } : entry
    );
    persistSession({ checklist: items }).then(renderChecklist);
  });

  const label = document.createElement("label");
  label.className = "checklist-text";

  if (editingIndex === index) {
    const edit = document.createElement("input");
    edit.type = "text";
    edit.className = "checklist-edit";
    edit.value = item.text || "";
    edit.maxLength = 200;
    edit.autocomplete = "off";
    edit.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commitEdit(index, edit.value);
      } else if (event.key === "Escape") {
        editingIndex = -1;
        renderChecklist();
      }
    });
    edit.addEventListener("blur", () => {
      commitEdit(index, edit.value);
    });
    label.append(edit);
    setTimeout(() => edit.focus(), 0);
  } else {
    const span = document.createElement("span");
    span.textContent = item.text || "";
    span.title = item.text || "";
    label.append(span);
  }

  const actions = document.createElement("div");
  actions.className = "checklist-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "saved-remove row-btn";
  editButton.innerHTML = PENCIL_SVG;
  editButton.append(document.createTextNode("Edit"));
  editButton.addEventListener("click", () => {
    editingIndex = index;
    renderChecklist();
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "saved-remove row-btn is-danger";
  removeButton.innerHTML = TRASH_SVG;
  removeButton.append(document.createTextNode("Remove"));
  removeButton.addEventListener("click", () => {
    const items = session.checklist.filter((_, itemIndex) => itemIndex !== index);
    persistSession({ checklist: items }).then(renderChecklist);
  });

  actions.append(editButton, removeButton);
  li.append(grip, checkbox, label, actions);
  return li;
}

function renderChecklist() {
  const items = session && Array.isArray(session.checklist) ? session.checklist : [];
  const completed = items.filter((item) => Boolean(item.completed)).length;
  if (checklistProgress) {
    checklistProgress.textContent =
      items.length === 0
        ? "No checklist items yet."
        : `${completed} / ${items.length} completed`;
  }
  if (checklistList) {
    checklistList.replaceChildren();
    items.forEach((item, index) => {
      if (item && typeof item === "object") {
        checklistList.append(buildChecklistItem(item, index));
      }
    });
  }
  renderStats().catch(() => {});
}

function faviconInitial(item) {
  const url = item && item.url ? item.url : "";
  let host = "";
  try {
    host = url ? new URL(url).hostname : "";
  } catch (err) {
    host = "";
  }
  const letter =
    (host && host.replace(/^www\./, "")[0]) ||
    (item && item.title && item.title.trim()[0]) ||
    "T";
  return letter.toUpperCase();
}

function buildSavedItem(item) {
  const li = document.createElement("li");
  li.className = "saved-item";
  li.tabIndex = 0;
  li.setAttribute("role", "button");
  li.setAttribute("aria-label", `Open ${item.title || "saved tab"}`);
  li.addEventListener("click", () => openSaved(item.id));
  li.addEventListener("keydown", (event) => {
    if (event.target !== li) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSaved(item.id);
    }
  });

  const favicon = document.createElement("div");
  favicon.className = "saved-favicon";
  favicon.textContent = faviconInitial(item);

  const info = document.createElement("div");
  info.className = "saved-info";

  const title = document.createElement("p");
  title.className = "saved-title";
  title.textContent = item.title || "Untitled tab";
  title.title = item.url || "";

  const meta = document.createElement("p");
  meta.className = "saved-meta";
  const hostname = describeUrl(item.url);
  meta.textContent = hostname
    ? `${hostname} · ${formatRelativeTime(item.savedAt)}`
    : formatRelativeTime(item.savedAt);
  meta.title = item.url
    ? `${item.url}${item.workflow ? `\nWorkflow: ${item.workflow}` : ""}`
    : "";

  info.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "saved-actions";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "saved-open";
  openButton.innerHTML = EXTERNAL_SVG;
  openButton.title = "Open";
  openButton.setAttribute("aria-label", "Open");
  openButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openSaved(item.id);
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "saved-remove";
  removeButton.innerHTML = TRASH_SVG;
  removeButton.title = "Remove";
  removeButton.setAttribute("aria-label", "Remove");
  removeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    removeSaved(item.id);
  });

  actions.append(openButton, removeButton);
  li.append(favicon, info, actions);
  return li;
}

async function renderSavedTabs() {
  const result = await chrome.storage.local.get(SAVED_KEY);
  const tabs = Array.isArray(result[SAVED_KEY]) ? result[SAVED_KEY] : [];
  if (savedEmpty) savedEmpty.hidden = tabs.length > 0;
  if (savedCount) {
    savedCount.textContent = tabs.length === 1 ? "1 saved" : `${tabs.length} saved`;
  }
  if (savedList) {
    savedList.replaceChildren();
    tabs.forEach((item) => {
      if (item && typeof item === "object") {
        savedList.append(buildSavedItem(item));
      }
    });
  }
  renderStats().catch(() => {});
}

async function renderStats() {
  if (windowId == null) return;
  let openCount = 0;
  try {
    const tabs = await chrome.tabs.query({ windowId });
    openCount = tabs.filter((tab) => {
      const url = tab.url || tab.pendingUrl || "";
      return /^https?:\/\//i.test(url);
    }).length;
  } catch (err) {
    openCount = 0;
  }
  const savedResult = await chrome.storage.local.get(SAVED_KEY);
  const savedTabs = Array.isArray(savedResult[SAVED_KEY]) ? savedResult[SAVED_KEY] : [];
  const items = session && Array.isArray(session.checklist) ? session.checklist : [];
  const done = items.filter((item) => Boolean(item.completed)).length;
  if (statOpen && statOpen.querySelector(".stat-value")) {
    statOpen.querySelector(".stat-value").textContent = String(openCount);
  }
  if (statSaved && statSaved.querySelector(".stat-value")) {
    statSaved.querySelector(".stat-value").textContent = String(savedTabs.length);
  }
  if (statChecklist) {
    const value = statChecklist.querySelector(".stat-value");
    if (value) {
      value.textContent =
        items.length === 0 ? "—" : `${done}/${items.length}`;
    }
    statChecklist.title =
      items.length === 0 ? "No checklist items" : `${done} of ${items.length} checklist items done`;
  }
}

async function openSaved(itemId) {
  try {
    await chrome.runtime.sendMessage({ type: "LOCKED_IN_OPEN_SAVED", itemId });
  } catch (err) {
    // Background could not handle it; the saved item stays.
  }
  renderSavedTabs();
}

async function removeSaved(itemId) {
  const result = await chrome.storage.local.get(SAVED_KEY);
  const tabs = Array.isArray(result[SAVED_KEY]) ? result[SAVED_KEY] : [];
  await chrome.storage.local.set({
    [SAVED_KEY]: tabs.filter((item) => item.id !== itemId),
  });
  renderSavedTabs();
}

on(form, "submit", (event) => {
  event.preventDefault();
  const workflow = input.value.trim();
  if (saveButton) saveButton.disabled = true;
  persistSession({ workflow }).then(() => {
    if (saveButton) saveButton.disabled = false;
    showConfirmation();
    renderSession();
  });
});

function toggleSession() {
  const nextActive = !(session && session.active);
  const patch = {
    active: nextActive,
    focusStartedAt: nextActive ? Date.now() : null,
  };
  if (toggleButton) toggleButton.disabled = true;
  if (masterToggle) masterToggle.disabled = true;
  const finish = () => {
    if (toggleButton) toggleButton.disabled = false;
    if (masterToggle) masterToggle.disabled = false;
  };
  return persistSession(patch)
    .then(renderSession)
    .finally(finish);
}

on(toggleButton, "click", toggleSession);

on(masterToggle, "click", toggleSession);

on(checklistForm, "submit", (event) => {
  event.preventDefault();
  const text = checklistInput.value.trim();
  if (!text) return;
  const items = [
    ...(session && Array.isArray(session.checklist) ? session.checklist : []),
  ];
  items.push({ id: randomId(), text, completed: false });
  checklistInput.value = "";
  persistSession({ checklist: items }).then(renderChecklist);
});

on(devBypassInput, "change", () => {
  chrome.storage.local
    .set({ [DEV_BYPASS_CLEANUP_KEY]: devBypassInput.checked })
    .catch(() => {});
});

on(document.querySelector(".dev-section-head"), "click", (event) => {
  const head = document.querySelector(".dev-section-head");
  const body = document.getElementById("dev-section-body");
  const isOpen = head.classList.toggle("is-open");
  if (body) body.hidden = !isOpen;
  head.setAttribute("aria-expanded", String(isOpen));
});

function renderSettings() {
  if (focusTimerInput) focusTimerInput.checked = settings.focusTimer === true;
  if (enforceTabsInput) enforceTabsInput.checked = settings.enforceTabs !== false;
  if (organizeTabsInput) organizeTabsInput.checked = settings.organizeTabs !== false;
  const frequency = Number(settings.cleanupFrequency);
  if (cleanupFrequencySelect) {
    cleanupFrequencySelect.value = [0, 15, 30, 60].includes(frequency)
      ? String(frequency)
      : "30";
  }
}

async function persistSettings(patch) {
  const merged = { ...SETTINGS_DEFAULTS, ...settings, ...(patch || {}) };
  settings = merged;
  await chrome.storage.local.set({ [SETTINGS_KEY]: merged }).catch(() => {});
}

on(focusTimerInput, "change", () => {
  persistSettings({ focusTimer: focusTimerInput.checked }).then(() => {
    renderFocusTime();
  });
});

on(enforceTabsInput, "change", () => {
  persistSettings({ enforceTabs: enforceTabsInput.checked });
});

on(organizeTabsInput, "change", () => {
  persistSettings({ organizeTabs: organizeTabsInput.checked });
});

on(cleanupFrequencySelect, "change", () => {
  persistSettings({ cleanupFrequency: Number(cleanupFrequencySelect.value) });
});

on(endSessionButton, "click", () => {
  if (windowId == null) return;
  endSessionButton.disabled = true;
  chrome.runtime
    .sendMessage({ type: "LI_END_SESSION", windowId })
    .catch(() => {})
    .finally(() => {
      endSessionButton.disabled = false;
    });
});

/* ─── Theme ─── */
function applyTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  if (darkModeToggle) darkModeToggle.checked = dark;
}

function initTheme() {
  return chrome.storage.local
    .get(THEME_KEY)
    .then((result) => applyTheme(result[THEME_KEY] === "dark" ? "dark" : "light"))
    .catch(() => {});
}

function persistTheme(theme) {
  chrome.storage.local.set({ [THEME_KEY]: theme }).catch(() => {});
}

on(darkModeToggle, "change", () => {
  const theme = darkModeToggle.checked ? "dark" : "light";
  applyTheme(theme);
  persistTheme(theme);
});

/* ─── Views ─── */
const views = ["checklist", "timer", "saved", "settings"];

function showView(name) {
  views.forEach((viewName) => {
    const section = document.querySelector(`.view[data-view="${viewName}"]`);
    if (section) {
      const show = viewName === name;
      section.hidden = !show;
      section.classList.toggle("is-hidden", !show);
    }
  });
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.goto === name);
  });
}

function handleGoTo(target) {
  if (!views.includes(target)) return;
  showView(target);
}

document.querySelectorAll("[data-goto]").forEach((btn) => {
  on(btn, "click", () => handleGoTo(btn.dataset.goto));
});

on(headerSettingsBtn, "click", () => handleGoTo("settings"));
on(viewTimerBtn, "click", () => handleGoTo("timer"));

function showBanner(kind, text) {
  if (!appBanner || !appBannerText) return;
  appBanner.classList.toggle("banner-error", kind === "error");
  appBanner.classList.toggle("banner-loading", kind !== "error");
  appBannerText.textContent = text;
  appBanner.hidden = false;
}

function hideBanner() {
  if (appBanner) appBanner.hidden = true;
}

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[SAVED_KEY]) {
      renderSavedTabs();
    }
    if (changes[SETTINGS_KEY] && changes[SETTINGS_KEY].newValue) {
      settings = { ...SETTINGS_DEFAULTS, ...changes[SETTINGS_KEY].newValue };
      renderSettings();
      renderFocusTime();
    }
    if (changes[THEME_KEY]) {
      applyTheme(changes[THEME_KEY].newValue === "dark" ? "dark" : "light");
    }
    if (changes[SESSIONS_KEY]) {
      readSessions().then((sessions) => {
        session =
          windowId != null && sessions[windowId] ? sessions[windowId] : null;
        if (session && !Array.isArray(session.checklist)) {
          session.checklist = [];
        }
        if (editingIndex === -1) {
          renderSession();
        }
      });
    }
  });
} catch (err) {
  console.error("Locked In: could not attach storage listener", err);
}

(async () => {
  try {
    const win = await chrome.windows.getCurrent();
    if (win && typeof win.id === "number") windowId = win.id;
    await migrateLegacyWorkflow();
  } catch (err) {
    console.error("Locked In: popup init failed", err);
    showBanner(
      "error",
      "Couldn't load your session. Saved tabs are safe — try reopening the popup."
    );
  }

  const sessions = await readSessions();
  session = windowId != null && sessions[windowId] ? sessions[windowId] : null;
  if (session && !Array.isArray(session.checklist)) {
    session.checklist = [];
  }

  try {
    const devResult = await chrome.storage.local.get(DEV_BYPASS_CLEANUP_KEY);
    if (devBypassInput) {
      devBypassInput.checked = devResult[DEV_BYPASS_CLEANUP_KEY] === true;
    }
  } catch (err) {
    // Dev bypass defaults to off.
  }

  try {
    const settingsResult = await chrome.storage.local.get(SETTINGS_KEY);
    settings = {
      ...SETTINGS_DEFAULTS,
      ...(settingsResult[SETTINGS_KEY] || {}),
    };
  } catch (err) {
    settings = { ...SETTINGS_DEFAULTS };
  }

  try {
    renderSettings();
    await initTheme();
  } catch (err) {
    console.error("Locked In: settings render failed", err);
  }

  hideBanner();
  showView("checklist");
  try {
    renderSession();
    renderSavedTabs();
  } catch (err) {
    console.error("Locked In: popup render failed", err);
  }

  chrome.runtime
    .sendMessage({ type: "LI_SYNC_ICONS" })
    .catch(() => {});
})();