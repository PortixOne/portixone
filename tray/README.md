# @portixone/tray

A lightweight Windows system tray companion for the Portix Runtime — deliberately not Electron. Built on [`systray2`](https://www.npmjs.com/package/systray2), which wraps a small precompiled tray binary (no native build step, no ~150MB+ Electron footprint).

It doesn't manage the runtime process directly — the Runtime runs independently as a Windows Service (see [`runtime/README.md`](../runtime/README.md#windows-service)), and the tray just talks to its already-running HTTP API. That split keeps the runtime usable headless (no one logged in, e.g. a kiosk) while still giving a developer at the machine a visible status and quick controls.

## Run it

```bash
npm run build
npm start
```

Shows a tray icon with:
- A live status line — polls `GET /health` every 5s (`● Runtime online (v0.1.0)` / `○ Runtime offline`; hover for the default printer, if any)
- **Open Logs** — opens the Windows Service's log directory. (A local Dashboard — status, printers, queue, logs, all in one localhost page — is a bigger follow-up, not a rename of this; see ROADMAP.)
- **Restart Runtime** — `net stop` + `net start` on the Windows Service (needs an elevated/Administrator shell — the tray process itself doesn't need admin to run, but this specific action does)
- **Close Tray** — closes the tray icon only; the Runtime keeps running in the background

## Why no Electron

The runtime has been deliberately free of heavy dependencies since day one (no node-gyp, no native addons). Electron would work for a tray + status UI, but it's a ~150-200MB dependency for what's fundamentally an icon and a five-item menu. `systray2` does the same job without it, keeping this piece as modular and light as the rest of the stack.
