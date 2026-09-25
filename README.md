# Locked In

Locked In is a Chrome/Edge browser extension that keeps you aligned with your current workflow. It turns a browsing window into a focus session, prompts you about new tabs, and cleans up tabs that fall outside what you're working on.

## What it does

- You define a workflow (your current task) at the start of a session.
- New web tabs that don't fit the workflow are flagged so you can Keep, Save for later, or Close them.
- With **Enforce Tabs** on, undecided new tabs are auto-closed when enforcement runs.
- The **Still Locked In** cleanup periodically rechecks open tabs and prompts you before closing anything.

## Core features

- **Window-scoped focus sessions** — each browser window has an independent session; Locked In applies to the window you arm it in.
- **Workflow** — a short description of what you're focusing on; edits to it are shared across the session.
- **Keep / Save for later / Close** — the prompt shown for a new, unfitting tab.
- **Enforce Tabs** — auto-close undecided new tabs.
- **Still Locked In** — periodic cleanup that revalidates tabs with the workflow.
- **Checklist** — session-scoped task list.
- **Saved tabs** — tabs saved "for later," reopenable from the popup.
- **Tab activity / organization** — tracking and reordering of tabs by activity.
- **Focus timer** — elapsed focus time shown in the popup.
- **Session data** — per-window session state, focus start time, activity tracking.
- **Settings** — tab enforcement, automatic tab organization, cleanup frequency, end session, dark mode, focus timer, developer options.

## Installation (Chrome)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right).
3. Click **Load unpacked**.
4. Select the repository folder.

## Installation (Edge)

1. Open `edge://extensions`.
2. Enable **Developer mode** (toggle in the sidebar).
3. Click **Load unpacked**.
4. Select the repository folder.

## Basic usage

1. Open the popup and toggle **Locked In** on.
2. Enter a **workflow** for what you're working on.
3. Browse as usual. When a new tab opens, use **Keep**, **Save for later**, or **Close**.
4. The popup's **Still Locked In** flow rechecks your open tabs on the cleanup frequency you set.
5. Turn **Enforce Tabs** on if you want undecided new tabs auto-closed.

## Privacy / storage

- All data is stored locally using `chrome.storage.local` and `chrome.storage.session`.
- No backend, no authentication, no accounts.
- The extension makes no network or API calls.
- No data intentionally leaves your browser.

## Project structure

```
background.js      Service worker: sessions, tab tracking, enforcement, cleanup
content.js         Content script: prompt overlay injected into web tabs
popup.html         Popup UI
popup.css          Popup styles
popup.js           Popup logic
manifest.json      Extension manifest (Manifest V3)
main-icon*.png     Popup and toolbar icons
locked-icon*.png   "Locked In" active-state icons
```

## V1 status

Current version: **1.0.0**. The V1 release is the manually verified, frozen feature set described above.

> V2 AI features are not part of this release. The repository is a plain Manifest V3 extension with no build step.