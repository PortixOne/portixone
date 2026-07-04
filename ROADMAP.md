# PortixOne Roadmap

## Runtime

- [x] Runtime boots
- [x] HTTP API
- [x] Windows Spooler Driver
- [x] First Physical Print

## Phase 2 — Developer Zero

**Objective**: validate that a developer who has never seen PortixOne can install it, connect to the runtime, and print a receipt without any assistance.

Guiding question: *"Can a complete stranger successfully use PortixOne without asking the founder for help?"* If yes, onboarding is complete.

**Guiding principle**: do not add new features until an external developer has successfully used the previous one. The current risk is no longer technical — it's adoption.

- [x] **2.1 — Publish the SDK**: `@portixone/sdk` (with `@portixone/protocol` and `@portixone/shared`) live on npm. Verified with a real `npm install @portixone/sdk` from a clean directory, outside the monorepo, against the public registry
- [x] **2.2 — Official Runtime Installer**: download → install → start runtime → `npm install @portixone/sdk` → `new Portix()` → `connect()` → `print()`, no manual configuration
  - [x] Windows Service (`runtime/scripts/service.install.js`, via `node-windows` — no native deps). Verified: `/health` responded, a `/print` job was accepted while running as `LocalSystem` (physical output pending a printer being reconnected)
  - [x] Tray app (`tray/`) — lightweight, no Electron (`systray2`). Verified running standalone and from the installed location, with a live status icon and working menu
  - [x] Installer (`installer/portixone.iss`, Inno Setup) — compiled and verified end-to-end on this machine, including the harder cases: reinstalling *while the tray was actively running* (previously stacked duplicate tray processes, and separately could hang an unattended install on Inno Setup's "files in use" prompt), and a full uninstall (previously left empty folders behind because the tray still held file handles open). All fixed and re-verified — see `installer/README.md` for the specific bugs and fixes. Silent/scripted installs need `/CLOSEAPPLICATIONS /FORCECLOSEAPPLICATIONS`, documented there.
  - [x] Tray UX pass per product review: menu items renamed to product language (`Restart Runtime`, `Close Tray`), status line dropped the raw printer name in favor of general status + version
  - [ ] **Not verified — needs a human**: a clean machine with no Node.js/dev tools installed (today's installer requires Node.js as a prerequisite and fails with a clear message if it's missing — bundling a self-contained Node runtime would remove this, see below), and a real Windows restart to confirm the service auto-starts (both need a machine/reboot outside what this session can safely do)
  - [ ] Bundle a self-contained Node runtime so Node.js isn't a prerequisite
  - [ ] Real icon/visual identity (today's tray icon is a solid-color placeholder) and a code-signing certificate (installer is unsigned — triggers SmartScreen). Deliberate tech debt until real brand assets exist
- [ ] **2.7 — Local Dashboard**: a `localhost` page showing status, printers, queue, and logs — replaces "Open Logs" with something closer to "Open Dashboard" once it's real. Flagged in product review as bigger than a tray menu rename, so it's its own item rather than done inline
- [x] **2.3 — Mock mode**: `new Portix({ mode: "mock" })` renders a receipt preview instead of printing — zero hardware requirement, better tutorials/CI/first experience. Switching to production is only `mode: "runtime"`. `sdk-js@0.2.0` published; verified with a real `npm install` + `npm start` in `examples/basic-print` against the public registry
- [ ] **2.4 — Measure TTFP** (Time To First Print: from opening the docs to the first successful print). Good: < 5 min. Excellent: < 2 min. Measure continuously
- [ ] **2.5 — External developer validation**: 5 external developers (React, Next.js, Vue, Electron, Node.js), documenting install problems, doc gaps, confusing APIs, runtime issues, error messages, missing examples. Fix every issue before adding major new features
- [ ] **2.6 — Auto-update and release system**: the installer/service update themselves without a manual reinstall. Depends on 2.2's installer actually shipping first

### Not yet (delayed until Developer Zero is validated)

Linux Runtime · macOS Runtime · Bluetooth · Serial · USB Discovery · Multi-printer · Cloud · Marketplace · Analytics · Billing — implement only if one of them directly blocks onboarding.

## Phase 3 — Ecosystem

After onboarding validation: Device Discovery · Printer Status API · Multi-printer Support · Linux Runtime · macOS Runtime · USB/HID/Bluetooth · Scales · Cash Drawers · SDK for Go · SDK for Python · SDK for .NET.

## Cloud Platform (closed, separate repo)

Auth, projects, API keys, dashboard, device fleet management, licensing, telemetry, team organizations, managed updates, billing, enterprise sync. Not tracked in this roadmap — see [Open source vs. closed](README.md#open-source-vs-closed) in the README.

---

**Product philosophy**: the objective is no longer proving that PortixOne works — it already does. The objective now is proving that anyone can make it work. When an external developer can install PortixOne, connect to a runtime, and print a receipt in under two minutes using only the official documentation, the onboarding phase is complete. Only then should the platform aggressively expand its capabilities. Developer Zero comes before Feature One.
