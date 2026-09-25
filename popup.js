const SESSIONS_KEY = "li_sessions";
const MIGRATED_KEY = "li_migrated";
const LEGACY_STORAGE_KEY = "currentWorkflow";
const SAVED_KEY = "savedTabs";
const DEV_BYPASS_CLEANUP_KEY = "li_dev_bypass_cleanup_cooldown";
const SETTINGS_KEY = "li_settings";
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
const focusTime = document.getElementById("focus-time");
const checklistForm = document.getElementById("checklist-form");
const checklistInput = document.getElementById("checklist-input");
const checklistAdd = document.getElementById("checklist-add");
const checklistProgress = document.getElementById("checklist-progress");
const checklistList = document.getElementById("checklist-list");
const devBypassInput = document.getElementById("dev-bypass");
const savedList = document.getElementById("saved-list");
const savedEmpty = document.getElementById("saved-empty");
const focusTimerInput = document.getElementById("focus-timer");
const enforceTabsInput = document.getElementById("enforce-tabs-checkbox");
const organizeTabsInput = document.getElementById("organize-tabs-checkbox");
const cleanupFrequencySelect = document.getElementById("cleanup-frequency-select");
const endSessionButton = document.getElementById("end-session-button");

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
  if (!settings.focusTimer) {
    focusTime.textContent = "";
    return;
  }
  const active = Boolean(session && session.active);
  const started = session && typeof session.focusStartedAt === "number" ? session.focusStartedAt : null;
  if (!active || started == null) {
    focusTime.textContent = "";
    return;
  }
  const update = () => {
    focusTime.textContent = `Focus ${formatFocusDuration(Date.now() - started)}`;
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
    onboardingStatus: active ? "accepted" : "pending",
    onboardingOfferedAt: null,
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
  confirmation.hidden = false;
  if (confirmationTimeoutId) {
    clearTimeout(confirmationTimeoutId);
  }
  confirmationTimeoutId = setTimeout(() => {
    confirmation.hidden = true;
  }, 2000);
}

function renderSession() {
  const active = Boolean(session && session.active);
  sessionDot.classList.toggle("is-active", active);
  sessionState.textContent = active ? "Locked in" : "Inactive";
  sessionHint.textContent = active
    ? "New tabs will be checked against your workflow."
    : "Enforcement is off. Your workflow is kept.";
  toggleButton.textContent = active ? "Turn off" : "Turn on";
  toggleButton.classList.toggle("is-active", active);
  input.value = session && session.workflow ? session.workflow : "";
  renderFocusTime();
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

function buildChecklistItem(item, index) {
  const li = document.createElement("li");
  li.className = "checklist-item";
  li.classList.toggle("is-done", Boolean(item.completed));

  const grip = document.createElement("span");
  grip.className = "checklist-grip";
  grip.textContent = "☰";
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
  actions.className = "saved-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "saved-remove";
  editButton.textContent = "Edit";
  editButton.addEventListener("click", () => {
    editingIndex = index;
    renderChecklist();
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "saved-remove";
  removeButton.textContent = "Remove";
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
  checklistProgress.textContent =
    items.length === 0
      ? "No checklist items yet."
      : `${completed} / ${items.length} completed`;
  checklistList.replaceChildren();
  items.forEach((item, index) => {
    if (item && typeof item === "object") {
      checklistList.append(buildChecklistItem(item, index));
    }
  });
}

function buildSavedItem(item) {
  const li = document.createElement("li");
  li.className = "saved-item";

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
  openButton.textContent = "Open";
  openButton.addEventListener("click", () => openSaved(item.id));

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "saved-remove";
  removeButton.textContent = "Remove";
  removeButton.addEventListener("click", () => removeSaved(item.id));

  actions.append(openButton, removeButton);
  li.append(info, actions);
  return li;
}

async function renderSavedTabs() {
  const result = await chrome.storage.local.get(SAVED_KEY);
  const tabs = Array.isArray(result[SAVED_KEY]) ? result[SAVED_KEY] : [];
  savedEmpty.hidden = tabs.length > 0;
  savedList.replaceChildren();
  tabs.forEach((item) => {
    if (item && typeof item === "object") {
      savedList.append(buildSavedItem(item));
    }
  });
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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const workflow = input.value.trim();
  saveButton.disabled = true;
  persistSession({ workflow }).then(() => {
    saveButton.disabled = false;
    showConfirmation();
    renderSession();
  });
});

toggleButton.addEventListener("click", async () => {
  const nextActive = !(session && session.active);
  const patch = { active: nextActive };
  if (nextActive) {
    patch.onboardingStatus = "accepted";
    patch.focusStartedAt = Date.now();
  } else {
    patch.focusStartedAt = null;
    if (!session || session.onboardingStatus !== "accepted") {
      patch.onboardingStatus = "declined";
    }
  }
  toggleButton.disabled = true;
  try {
    await persistSession(patch);
  } finally {
    toggleButton.disabled = false;
  }
  renderSession();
});

checklistForm.addEventListener("submit", (event) => {
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

devBypassInput.addEventListener("change", () => {
  chrome.storage.local
    .set({ [DEV_BYPASS_CLEANUP_KEY]: devBypassInput.checked })
    .catch(() => {});
});

function renderSettings() {
  focusTimerInput.checked = settings.focusTimer === true;
  enforceTabsInput.checked = settings.enforceTabs !== false;
  organizeTabsInput.checked = settings.organizeTabs !== false;
  const frequency = Number(settings.cleanupFrequency);
  cleanupFrequencySelect.value = [0, 15, 30, 60].includes(frequency)
    ? String(frequency)
    : "30";
}

async function persistSettings(patch) {
  const merged = { ...SETTINGS_DEFAULTS, ...settings, ...(patch || {}) };
  settings = merged;
  await chrome.storage.local.set({ [SETTINGS_KEY]: merged }).catch(() => {});
}

focusTimerInput.addEventListener("change", () => {
  persistSettings({ focusTimer: focusTimerInput.checked }).then(() => {
    renderFocusTime();
  });
});

enforceTabsInput.addEventListener("change", () => {
  persistSettings({ enforceTabs: enforceTabsInput.checked });
});

organizeTabsInput.addEventListener("change", () => {
  persistSettings({ organizeTabs: organizeTabsInput.checked });
});

cleanupFrequencySelect.addEventListener("change", () => {
  persistSettings({ cleanupFrequency: Number(cleanupFrequencySelect.value) });
});

endSessionButton.addEventListener("click", () => {
  if (windowId == null) return;
  endSessionButton.disabled = true;
  chrome.runtime
    .sendMessage({ type: "LI_END_SESSION", windowId })
    .catch(() => {})
    .finally(() => {
      endSessionButton.disabled = false;
    });
});

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

(async () => {
  try {
    const win = await chrome.windows.getCurrent();
    if (win && typeof win.id === "number") windowId = win.id;
    await migrateLegacyWorkflow();
  } catch (err) {
    console.error("Locked In: popup init failed", err);
  }

  const sessions = await readSessions();
  session = windowId != null && sessions[windowId] ? sessions[windowId] : null;
  if (session && !Array.isArray(session.checklist)) {
    session.checklist = [];
  }

  try {
    const devResult = await chrome.storage.local.get(DEV_BYPASS_CLEANUP_KEY);
    devBypassInput.checked = devResult[DEV_BYPASS_CLEANUP_KEY] === true;
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
  renderSettings();

  renderSession();
  renderSavedTabs();
})();
