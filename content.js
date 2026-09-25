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

  const styles = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    .li-backdrop {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
      z-index: 2147483646;
    }
    .li-card {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      width: 380px;
      max-width: calc(100vw - 24px);
      background: #ffffff;
      color: #1a1a1a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
      padding: 16px;
      z-index: 2147483647;
    }
    .li-header {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .li-tab-title {
      margin-top: 10px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .li-tab-url {
      margin-top: 2px;
      font-size: 12px;
      color: #6b7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .li-question {
      margin-top: 12px;
      font-size: 13px;
      font-weight: 600;
    }
    .li-workflow {
      margin-top: 4px;
      font-size: 12px;
      color: #6b7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .li-status {
      margin-top: 10px;
      font-size: 12px;
      color: #b91c1c;
    }
    .li-onboarding-body {
      margin-top: 8px;
      font-size: 12.5px;
      color: #6b7280;
    }
    .li-actions {
      margin-top: 14px;
      display: flex;
      gap: 6px;
    }
    .li-btn {
      flex: 1;
      padding: 8px 6px;
      font-size: 12.5px;
      font-weight: 600;
      font-family: inherit;
      border-radius: 6px;
      cursor: pointer;
    }
    .li-btn:focus-visible {
      outline: 2px solid #111827;
      outline-offset: 2px;
    }
    .li-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .li-btn-keep {
      color: #ffffff;
      background: #111827;
      border: 1px solid #111827;
    }
    .li-btn-keep:hover {
      background: #374151;
    }
    .li-btn-save {
      color: #1a1a1a;
      background: #ffffff;
      border: 1px solid #d1d5db;
    }
    .li-btn-save:hover {
      background: #f9fafb;
    }
    .li-btn-close {
      color: #b91c1c;
      background: #ffffff;
      border: 1px solid #b91c1c;
    }
    .li-btn-close:hover {
      color: #ffffff;
      background: #991b1b;
    }
    .li-cleanup {
      width: 300px;
      max-width: calc(100vw - 32px);
      background: #ffffff;
      color: #1a1a1a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16);
      padding: 13px 14px;
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
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .li-cleanup-x {
      border: none;
      background: transparent;
      color: #6b7280;
      font-size: 14px;
      line-height: 1;
      padding: 3px 6px;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
    }
    .li-cleanup-x:hover {
      color: #1a1a1a;
      background: #f3f4f6;
    }
    .li-cleanup-sub {
      margin-top: 3px;
      font-size: 12px;
      color: #4b5563;
    }
    .li-cleanup-workflow {
      margin-top: 5px;
      font-size: 11.5px;
      color: #6b7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .li-cleanup-list {
      margin-top: 10px;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 7px;
      max-height: 190px;
      overflow-y: auto;
    }
    .li-cleanup-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .li-cleanup-item input[type="checkbox"] {
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      margin-top: 2px;
      cursor: pointer;
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
      color: #6b7280;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .li-cleanup-more {
      margin-top: 8px;
      font-size: 11.5px;
      color: #6b7280;
    }
    .li-cleanup-selectall {
      margin-top: 9px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      color: #6b7280;
      cursor: pointer;
    }
    .li-cleanup-selectall input[type="checkbox"] {
      width: 13px;
      height: 13px;
      cursor: pointer;
    }
    .li-cleanup-actions {
      margin-top: 10px;
      display: flex;
      justify-content: flex-end;
    }
    .li-cleanup-close-btn {
      padding: 7px 13px;
      font-size: 12.5px;
      font-weight: 600;
      font-family: inherit;
      color: #ffffff;
      background: #111827;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    .li-cleanup-close-btn:hover {
      background: #374151;
    }
    .li-cleanup-close-btn:disabled {
      opacity: 0.45;
      cursor: default;
    }
    .li-cleanup-close-btn:focus-visible {
      outline: 2px solid #111827;
      outline-offset: 2px;
    }
    .li-cleanup-note {
      margin-top: 8px;
      font-size: 11.5px;
      color: #15803d;
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
    header.textContent = "Locked In";

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
    question.textContent = "Is this relevant to your current workflow?";

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

  function buildOnboardingOverlay() {
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
    header.textContent = "Locked In";

    const question = document.createElement("div");
    question.className = "li-question";
    question.textContent = "Are you ready to lock in?";

    const body = document.createElement("div");
    body.className = "li-onboarding-body";
    body.textContent =
      "Locked In checks that new tabs fit your current focus. Want to set up a workflow for this window?";

    const actions = document.createElement("div");
    actions.className = "li-actions";

    const yesButton = document.createElement("button");
    yesButton.type = "button";
    yesButton.className = "li-btn li-btn-keep";
    yesButton.textContent = "Yes, let's go";

    const noButton = document.createElement("button");
    noButton.type = "button";
    noButton.className = "li-btn li-btn-save";
    noButton.textContent = "Not right now";

    actions.append(yesButton, noButton);
    card.append(header, question, body, actions);
    shadow.append(style, backdrop, card);

    yesButton.addEventListener("click", () => {
      dismissOverlay();
      sendRuntimeMessage({ type: "LI_ONBOARDING_RESPONSE", choice: "yes" }).catch(
        (err) => {
          console.error("Locked In: failed to send onboarding response", err);
        }
      );
    });

    noButton.addEventListener("click", () => {
      dismissOverlay();
      sendRuntimeMessage({ type: "LI_ONBOARDING_RESPONSE", choice: "no" }).catch(
        (err) => {
          console.error("Locked In: failed to send onboarding response", err);
        }
      );
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
    title.textContent = "Still Locked In?";
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

    const tabs = Array.isArray(data.tabs) ? data.tabs : [];
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
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "li-cleanup-close-btn";
    closeBtn.textContent = "Close selected";
    closeBtn.disabled = true;
    actions.append(closeBtn);

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

      if (message.type === "LI_ONBOARDING_SHOW") {
        if (!overlayHost) {
          overlayHost = buildOnboardingOverlay();
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

  function requestOnboardingCheck(attempt) {
    if (
      window.top !== window ||
      (window.location.protocol !== "http:" && window.location.protocol !== "https:")
    ) {
      return;
    }
    sendRuntimeMessage({ type: "LI_CHECK_ONBOARDING" }).catch(() => {
      if (attempt < 5) {
        setTimeout(() => requestOnboardingCheck(attempt + 1), 500);
      }
    });
  }

  requestOnboardingCheck(0);
})();