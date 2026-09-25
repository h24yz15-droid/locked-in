(() => {
  if (window.top !== window) return;

  let overlayHost = null;

  const INVALIDATED_CONTEXT_TEXT = "Extension context invalidated";
  const CLEANUP_FADE_MS = 90 * 1000;
  const CLEANUP_FADE_DURATION_MS = 900;
  const CLEANUP_DISMISS_DELAY_MS = 2500;

  function isInvalidatedContextError(error) {
    return Boolean(
      error &&
        typeof error.message === "string" &&
        error.message.includes(INVALIDATED_CONTEXT_TEXT)
    );
  }

  function isExtensionContextValid() {
    try {
      return Boolean(chrome.runtime && chrome.runtime.id);
    } catch (err) {
      return false;
    }
  }

  function sendRuntimeMessage(message) {
    if (!isExtensionContextValid()) {
      return Promise.resolve({ contextInvalidated: true });
    }

    let pending;
    try {
      pending = chrome.runtime.sendMessage(message);
    } catch (err) {
      if (isInvalidatedContextError(err)) {
        return Promise.resolve({ contextInvalidated: true });
      }
      return Promise.reject(err);
    }

    return Promise.resolve(pending).then(
      (response) => response,
      (err) => {
        if (isInvalidatedContextError(err)) {
          return { contextInvalidated: true };
        }
        throw err;
      }
    );
  }

  function dismissOverlay() {
    if (overlayHost) {
      overlayHost.remove();
      overlayHost = null;
    }
  }

  const brandIconUrl = (() => {
    try {
      return chrome.runtime && chrome.runtime.id
        ? chrome.runtime.getURL("main-icon.png")
        : "";
    } catch (err) {
      return "";
    }
  })();

  const lockedIconUrl = (() => {
    try {
      return chrome.runtime && chrome.runtime.id
        ? chrome.runtime.getURL("locked-icon.png")
        : "";
    } catch (err) {
      return "";
    }
  })();

  const styles = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    [hidden] {
      display: none !important;
    }
    .li-backdrop {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      background: rgba(66, 52, 52, 0.38);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      z-index: 2147483646;
    }
    .li-card,
    .li-cleanup {
      --ink: #423434;
      --muted: #9b8b80;
      --edge: #e9e2da;
      --surface: #ffffff;
      --cyan: #26c5e1;
      --green: #4e9c3d;
      --green-soft: #7ed957;
      --danger: #c2432c;
      --shadow: 0 10px 30px rgba(66, 52, 52, 0.16), 0 2px 8px rgba(66, 52, 52, 0.08);
    }
    @media (prefers-color-scheme: dark) {
      .li-card,
      .li-cleanup {
        --ink: #f2ece5;
        --muted: #b3a79b;
        --edge: #3a322b;
        --surface: #1e1b18;
        --green: #7ed957;
        --danger: #ff906f;
        --shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.3);
      }
    }
    .li-card {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      width: 384px;
      max-width: calc(100vw - 24px);
      background: var(--surface);
      color: var(--ink);
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont,
        "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      border: 1px solid var(--edge);
      border-radius: 16px;
      box-shadow: var(--shadow);
      padding: 18px;
      z-index: 2147483647;
    }
    .li-header {
      display: flex;
      align-items: center;
      gap: 9px;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .li-brand-icon {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      object-fit: contain;
      border-radius: 50%;
    }
    .li-brand-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green-soft);
      margin-left: auto;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--green-soft) 22%, transparent);
    }
    .li-tab-title {
      margin-top: 12px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .li-tab-url {
      margin-top: 2px;
      font-size: 12px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .li-question {
      margin-top: 14px;
      font-size: 13.5px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .li-workflow {
      margin-top: 5px;
      font-size: 12px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .li-workflow::before {
      content: "";
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--green-soft);
      margin-right: 6px;
      vertical-align: 1px;
    }
    .li-status {
      margin-top: 10px;
      font-size: 12px;
      color: var(--danger);
    }
    .li-actions {
      margin-top: 16px;
      display: flex;
      gap: 8px;
    }
    .li-btn {
      flex: 1;
      padding: 9px 8px;
      font-size: 12.5px;
      font-weight: 700;
      font-family: inherit;
      border-radius: 10px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .li-btn:focus-visible {
      outline: 2px solid var(--cyan);
      outline-offset: 2px;
    }
    .li-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .li-btn-keep {
      color: var(--ink);
      background: var(--cyan);
      border: 1px solid var(--cyan);
    }
    .li-btn-keep:hover {
      background: color-mix(in srgb, var(--cyan) 88%, #ffffff);
    }
    .li-btn-save {
      color: var(--ink);
      background: var(--surface);
      border: 1px solid var(--edge);
    }
    .li-btn-save:hover {
      border-color: var(--cyan);
    }
    .li-btn-close {
      color: var(--danger);
      background: var(--surface);
      border: 1px solid color-mix(in srgb, var(--danger) 35%, transparent);
    }
    .li-btn-close:hover {
      color: var(--surface);
      background: var(--danger);
    }
    .li-cleanup {
      width: 306px;
      max-width: calc(100vw - 32px);
      background: var(--surface);
      color: var(--ink);
      font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont,
        "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      border: 1px solid var(--edge);
      border-radius: 16px;
      box-shadow: var(--shadow);
      padding: 15px 16px;
      user-select: none;
      transition: opacity 0.6s ease;
      opacity: 1;
    }
    .li-cleanup.is-fading {
      opacity: 0;
    }
    .li-cleanup-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .li-cleanup-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .li-cleanup-title-icon {
      width: 18px;
      height: 18px;
      object-fit: contain;
      border-radius: 50%;
    }
    .li-cleanup-x {
      border: none;
      background: transparent;
      color: var(--muted);
      font-size: 15px;
      line-height: 1;
      padding: 4px 7px;
      border-radius: 8px;
      cursor: pointer;
      font-family: inherit;
    }
    .li-cleanup-x:hover {
      color: var(--ink);
      background: color-mix(in srgb, var(--ink) 8%, transparent);
    }
    .li-cleanup-sub {
      margin-top: 4px;
      font-size: 12px;
      color: var(--muted);
    }
    .li-cleanup-workflow {
      margin-top: 5px;
      font-size: 11.5px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .li-cleanup-workflow::before {
      content: "";
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--green-soft);
      margin-right: 6px;
      vertical-align: 1px;
    }
    .li-cleanup-list {
      margin-top: 10px;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 190px;
      overflow-y: auto;
    }
    .li-cleanup-item {
      display: flex;
      gap: 9px;
      align-items: flex-start;
      padding: 7px 9px;
      border-radius: 10px;
      border: 1px solid var(--edge);
      background: color-mix(in srgb, var(--ink) 2.5%, transparent);
    }
    .li-cleanup-item input[type="checkbox"] {
      flex-shrink: 0;
      width: 15px;
      height: 15px;
      margin-top: 1px;
      cursor: pointer;
      accent-color: var(--cyan);
    }
    .li-cleanup-info {
      flex: 1;
      min-width: 0;
    }
    .li-cleanup-item-title {
      font-size: 12.5px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .li-cleanup-item-host {
      font-size: 11px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .li-cleanup-item.li-cleanup-empty {
      justify-content: center;
      padding: 12px 9px;
      color: var(--muted);
      font-size: 12px;
      border-style: dashed;
      background: transparent;
    }
    .li-cleanup-more {
      margin-top: 8px;
      font-size: 11.5px;
      color: var(--muted);
    }
    .li-cleanup-selectall {
      margin-top: 10px;
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11.5px;
      color: var(--muted);
      cursor: pointer;
    }
    .li-cleanup-selectall input[type="checkbox"] {
      width: 14px;
      height: 14px;
      cursor: pointer;
      accent-color: var(--cyan);
    }
    .li-cleanup-actions {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .li-cleanup-close-btn,
    .li-cleanup-keep-btn {
      padding: 8px 13px;
      font-size: 12.5px;
      font-weight: 700;
      font-family: inherit;
      border-radius: 10px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .li-cleanup-keep-btn {
      color: var(--ink);
      background: var(--surface);
      border-color: var(--edge);
    }
    .li-cleanup-keep-btn:hover {
      border-color: var(--cyan);
    }
    .li-cleanup-close-btn {
      color: var(--ink);
      background: var(--cyan);
    }
    .li-cleanup-close-btn:hover {
      background: color-mix(in srgb, var(--cyan) 88%, #ffffff);
    }
    .li-cleanup-close-btn:disabled {
      opacity: 0.45;
      cursor: default;
    }
    .li-cleanup-close-btn:focus-visible,
    .li-cleanup-keep-btn:focus-visible {
      outline: 2px solid var(--cyan);
      outline-offset: 2px;
    }
    .li-cleanup-note {
      margin-top: 9px;
      font-size: 11.5px;
      color: var(--green);
      font-weight: 600;
    }
  `;

  function buildOverlay(workflow) {
    const host = document.createElement("div");
    host.setAttribute("data-locked-in-overlay", "");
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = styles;

    const backdrop = document.createElement("div");
    backdrop.className = "li-backdrop";

    const card = document.createElement("div");
    card.className = "li-card";

    const header = document.createElement("div");
    header.className = "li-header";
    if (brandIconUrl) {
      const brandIcon = document.createElement("img");
      brandIcon.className = "li-brand-icon";
      brandIcon.src = brandIconUrl;
      brandIcon.alt = "";
      header.append(brandIcon);
    }
    const brandName = document.createElement("span");
    brandName.textContent = "Locked In";
    const brandDot = document.createElement("span");
    brandDot.className = "li-brand-dot";
    header.append(brandName, brandDot);

    const tabTitle = document.createElement("div");
    tabTitle.className = "li-tab-title";
    tabTitle.textContent = document.title || "Untitled tab";
    tabTitle.title = document.title || "";

    const tabUrl = document.createElement("div");
    tabUrl.className = "li-tab-url";
    tabUrl.textContent = window.location.href;
    tabUrl.title = window.location.href;

    const question = document.createElement("div");
    question.className = "li-question";
    question.textContent = "What do you want to do with this tab?";

    const workflowEl = document.createElement("div");
    workflowEl.className = "li-workflow";
    workflowEl.hidden = !workflow;
    workflowEl.textContent = workflow ? `Current workflow: ${workflow}` : "";

    const statusEl = document.createElement("p");
    statusEl.className = "li-status";
    statusEl.hidden = true;

    const actions = document.createElement("div");
    actions.className = "li-actions";

    const keepButton = document.createElement("button");
    keepButton.type = "button";
    keepButton.className = "li-btn li-btn-keep";
    keepButton.textContent = "Keep";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "li-btn li-btn-save";
    saveButton.textContent = "Save for later";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "li-btn li-btn-close";
    closeButton.textContent = "Close";

    actions.append(keepButton, saveButton, closeButton);
    card.append(header, tabTitle, tabUrl, question, workflowEl, statusEl, actions);
    shadow.append(style, backdrop, card);

    function setBusy(busy) {
      keepButton.disabled = busy;
      saveButton.disabled = busy;
      closeButton.disabled = busy;
    }

    function showStatus(message) {
      statusEl.textContent = message;
      statusEl.hidden = false;
    }

    keepButton.addEventListener("click", async () => {
      setBusy(true);
      try {
        await sendRuntimeMessage({ type: "LOCKED_IN_KEEP" });
      } catch (err) {
        // Background unavailable; tab stays open either way.
      } finally {
        dismissOverlay();
      }
    });

    saveButton.addEventListener("click", async () => {
      setBusy(true);
      let response;
      try {
        response = await sendRuntimeMessage({
          type: "LOCKED_IN_SAVE_FOR_LATER",
        });
      } catch (err) {
        console.error("Locked In: save-for-later failed", err);
        setBusy(false);
        showStatus("Couldn't save this tab for later. Try again.");
        return;
      }

      if (response && response.contextInvalidated) {
        dismissOverlay();
        return;
      }

      if (response && response.ok) {
        dismissOverlay();
      } else {
        setBusy(false);
        showStatus("Couldn't save this tab for later. Try again.");
      }
    });

    closeButton.addEventListener("click", () => {
      dismissOverlay();
      sendRuntimeMessage({ type: "LOCKED_IN_CLOSE_TAB" }).catch((err) => {
        console.error("Locked In: failed to message background", err);
      });
    });

    return host;
  }

  function buildCleanupOverlay(data) {
    const host = document.createElement("div");
    host.setAttribute("data-locked-in-overlay", "");
    host.style.cssText =
      "position: fixed; top: 16px; right: 16px; z-index: 2147483647;";
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = styles;

    const card = document.createElement("div");
    card.className = "li-cleanup";

    const top = document.createElement("div");
    top.className = "li-cleanup-top";
    const title = document.createElement("div");
    title.className = "li-cleanup-title";
    if (lockedIconUrl) {
      const titleIcon = document.createElement("img");
      titleIcon.className = "li-cleanup-title-icon";
      titleIcon.src = lockedIconUrl;
      titleIcon.alt = "";
      title.append(titleIcon);
    }
    const titleText = document.createElement("span");
    titleText.textContent = "Still Locked In?";
    title.append(titleText);
    const dismissButton = document.createElement("button");
    dismissButton.type = "button";
    dismissButton.className = "li-cleanup-x";
    dismissButton.textContent = "✕";
    dismissButton.title = "Dismiss";
    top.append(title, dismissButton);

    const sub = document.createElement("div");
    sub.className = "li-cleanup-sub";
    sub.textContent = "Do you still need these tabs for this workflow?";

    const workflowEl = document.createElement("div");
    workflowEl.className = "li-cleanup-workflow";
    workflowEl.hidden = !data.workflow;
    workflowEl.textContent = data.workflow ? `Workflow: ${data.workflow}` : "";

    const list = document.createElement("ul");
    list.className = "li-cleanup-list";

    const tabs = (Array.isArray(data.tabs) ? data.tabs : []).filter(
      (tab) => tab && tab.tabId !== data.activeTabId
    );
    const selected = new Set();
    const rowBoxes = [];

    tabs.forEach((tab) => {
      const li = document.createElement("li");
      li.className = "li-cleanup-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.addEventListener("change", () => {
        if (cb.checked) {
          selected.add(tab.tabId);
        } else {
          selected.delete(tab.tabId);
        }
        closeBtn.disabled = selected.size === 0;
        if (tabs.length > 0) {
          selectAllCheckbox.checked = selected.size === tabs.length;
        }
      });
      rowBoxes.push(cb);

      const info = document.createElement("div");
      info.className = "li-cleanup-info";

      const tabTitle = document.createElement("div");
      tabTitle.className = "li-cleanup-item-title";
      tabTitle.textContent = tab.title || "Untitled tab";
      tabTitle.title = tab.url || "";

      const tabHost = document.createElement("div");
      tabHost.className = "li-cleanup-item-host";
      tabHost.textContent = tab.hostname || "";

      info.append(tabTitle, tabHost);
      li.append(cb, info);
      list.append(li);
    });

    if (tabs.length === 0) {
      const empty = document.createElement("li");
      empty.className = "li-cleanup-item li-cleanup-empty";
      empty.textContent = "No other tabs to close.";
      list.append(empty);
    }

    const selectAllRow = document.createElement("label");
    selectAllRow.className = "li-cleanup-selectall";
    const selectAllCheckbox = document.createElement("input");
    selectAllCheckbox.type = "checkbox";
    const selectAllLabel = document.createElement("span");
    selectAllLabel.textContent = "Select all visible";
    selectAllRow.append(selectAllCheckbox, selectAllLabel);
    selectAllCheckbox.addEventListener("change", () => {
      const value = selectAllCheckbox.checked;
      tabs.forEach((tab, i) => {
        rowBoxes[i].checked = value;
        if (value) {
          selected.add(tab.tabId);
        } else {
          selected.delete(tab.tabId);
        }
      });
      closeBtn.disabled = selected.size === 0;
    });
    selectAllRow.hidden = tabs.length === 0;

    const more = document.createElement("div");
    more.className = "li-cleanup-more";
    more.hidden = !(data.extraTabs > 0);
    more.textContent =
      data.extraTabs > 0
        ? data.extraTabs === 1
          ? "…and 1 more tab in this window"
          : `…and ${data.extraTabs} more tabs in this window`
        : "";

    const actions = document.createElement("div");
    actions.className = "li-cleanup-actions";
    const keepBtn = document.createElement("button");
    keepBtn.type = "button";
    keepBtn.className = "li-cleanup-keep-btn";
    keepBtn.textContent = "Keep";
    keepBtn.title = "Keep these tabs open for now";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "li-cleanup-close-btn";
    closeBtn.textContent = "Close selected";
    closeBtn.disabled = true;
    actions.append(keepBtn, closeBtn);

    const note = document.createElement("div");
    note.className = "li-cleanup-note";
    note.hidden = true;

    card.append(top, sub, workflowEl, list, selectAllRow, more, actions, note);
    shadow.append(style, card);

    let removed = false;
    let fadeTimer = null;
    let removalTimer = null;

    function clearTimers() {
      if (fadeTimer) clearTimeout(fadeTimer);
      if (removalTimer) clearTimeout(removalTimer);
      fadeTimer = null;
      removalTimer = null;
    }

    function removeCard() {
      if (removed) return;
      removed = true;
      clearTimers();
      dismissOverlay();
    }

    function scheduleFade() {
      fadeTimer = setTimeout(() => {
        card.classList.add("is-fading");
        removalTimer = setTimeout(removeCard, CLEANUP_FADE_DURATION_MS);
      }, CLEANUP_FADE_MS);
    }

    closeBtn.addEventListener("click", () => {
      if (selected.size === 0) return;
      closeBtn.disabled = true;
      const tabIds = Array.from(selected);
      sendRuntimeMessage({ type: "LI_CLEANUP_CLOSE", tabIds })
        .then((response) => {
          if (response && response.contextInvalidated) {
            removeCard();
            return;
          }
          const closed = response && Array.isArray(response.closed)
            ? response.closed.length
            : 0;
          note.hidden = false;
          note.textContent =
            closed > 0
              ? `Closing ${closed} tab${closed === 1 ? "" : "s"}…`
              : "No tabs were closed.";
          const extraTabIds = tabIds.length - closed;
          if (extraTabIds > 0) {
            note.textContent += ` ${extraTabIdText(extraTabIds)}`;
          }
          clearTimers();
          removalTimer = setTimeout(removeCard, CLEANUP_DISMISS_DELAY_MS);
        })
        .catch((err) => {
          console.error("Locked In: cleanup close failed", err);
          note.hidden = false;
          note.textContent = "Couldn't close the selected tabs.";
          closeBtn.disabled = false;
        });
    });

    dismissButton.addEventListener("click", () => {
      clearTimers();
      sendRuntimeMessage({ type: "LI_CLEANUP_DISMISS" }).catch((err) => {
        console.error("Locked In: failed to message background", err);
      });
      removeCard();
    });

    keepBtn.addEventListener("click", () => {
      clearTimers();
      sendRuntimeMessage({ type: "LI_CLEANUP_DISMISS" }).catch((err) => {
        console.error("Locked In: failed to message background", err);
      });
      removeCard();
    });

    scheduleFade();
    return host;
  }

  function extraTabIdText(count) {
    if (count === 1) return "1 tab was already closed.";
    return `${count} tabs were already closed.`;
  }

  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || typeof message.type !== "string") return false;

      if (message.type === "LOCKED_IN_SHOW") {
        if (!overlayHost) {
          overlayHost = buildOverlay(message.workflow);
          document.body.appendChild(overlayHost);
        }
        sendResponse({ ok: true });
        return false;
      }

      if (message.type === "LI_CLEANUP_SHOW") {
        if (!overlayHost) {
          overlayHost = buildCleanupOverlay(message);
          document.body.appendChild(overlayHost);
        }
        sendResponse({ ok: true });
        return false;
      }

      return false;
    });
  } catch (err) {
    if (!isInvalidatedContextError(err)) throw err;
  }

  function announceContentReady(attempt) {
    if (
      window.top !== window ||
      (window.location.protocol !== "http:" && window.location.protocol !== "https:")
    ) {
      return;
    }
    sendRuntimeMessage({ type: "LI_CONTENT_READY" }).catch(() => {
      if (attempt < 5) {
        setTimeout(() => announceContentReady(attempt + 1), 500);
      }
    });
  }

  announceContentReady(0);
})();