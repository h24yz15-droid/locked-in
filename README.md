# Locked In

Locked In is a Chrome/Edge browser extension that keeps you aligned with your current workflow. It turns a browsing window into a focus session, prompts you about new tabs, and helps you clean up tabs that are no longer needed.

## What it does

* You define a workflow (your current task) for a focus session.
* New web tabs are prompted for a decision, letting you Keep, Save for later, or Close them.
* With **Enforce Tabs** on, undecided new tabs are automatically closed when you leave them.
* **Still Locked In** periodically lets you review open tabs and select ones to close.

## Core features

* **Window-scoped focus sessions** — each browser window has an independent session; Locked In applies to the window you arm it in.
* **Workflow** — a short description of what you're focusing on; edits to it are shared across the session.
* **Keep / Save for later / Close** — the prompt shown for a new web tab.
* **Enforce Tabs** — automatically closes undecided new tabs when you leave them.
* **Still Locked In** — periodic cleanup for reviewing and closing tabs in the current session.
* **Checklist** — session-scoped task list.
* **Saved tabs** — tabs saved "for later," reopenable from the popup.
* **Tab activity / organization** — tracking and reordering of tabs by activity.
* **Focus timer** — elapsed focus time shown in the popup.
* **Session data** — per-window session state, focus start time, and activity tracking.
* **Settings** — tab enforcement, automatic tab organization, cleanup frequency, end session, dark mode, focus timer, and developer options.

## Installation

Locked In is currently distributed as an unpacked browser extension. No coding tools are required.

### Chrome

1. On the Locked In GitHub repository, click the green **`<> Code`** button at the top.
2. Click **Download ZIP**.
3. Unzip the downloaded file.
4. Open Chrome and go to `chrome://extensions`.
5. Turn on **Developer mode**.
6. Click **Load unpacked** and select the **unzipped Locked In folder**.

### Microsoft Edge

1. Click the green **`<> Code`** button on the Locked In GitHub repository.
2. Click **Download ZIP** and unzip the file.
3. Go to `edge://extensions`.
4. Turn on **Developer mode**.
5. Click **Load unpacked** and select the **unzipped Locked In folder**.

### Opera / Opera GX

1. Download and unzip the repository using the same steps above.
2. Go to `opera://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the **unzipped Locked In folder**.
5. Find **Locked In** in your extensions list and click **Details**.
6. Turn on **Allow access to search page results**.

### Brave

1. Download and unzip the repository using the same steps above.
2. Go to `brave://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the **unzipped Locked In folder**.

> **Tip:** If the browser says the manifest is missing or unreadable, make sure you selected the extracted folder that directly contains `manifest.json`, not the ZIP file or a folder above it.

## Basic usage

1. Open the popup and toggle **Locked In** on.
2. Enter a **workflow** for what you're working on.
3. Browse as usual. When a new web tab opens, use **Keep**, **Save for later**, or **Close**.
4. Use **Still Locked In** to review tabs in your current session and select ones to close.
5. Turn **Enforce Tabs** on if you want undecided new tabs to close automatically when you leave them.

## Privacy / storage

* All data is stored locally using `chrome.storage.local` and `chrome.storage.session`.
* No backend, authentication, or accounts.
* The extension makes no network or API calls.
* No data intentionally leaves your browser.

## Project structure

```text
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
