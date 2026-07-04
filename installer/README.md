# installer

Builds `PortixOneRuntimeSetup.exe` — installs the Runtime as a Windows Service and the tray app as a Start Menu / Startup shortcut. No Electron, no bundled Node runtime (yet) — the target machine needs Node.js 20+ already installed.

## Build

```bash
node installer/build-staging.js
```

Assembles `installer/staging/{runtime,tray}` — each a clean, production-only copy (no TypeScript source, no devDependencies, no workspace symlinks) that runs standalone. Verified: both `staging/runtime` and `staging/tray` boot correctly with only their own `node_modules`, outside the monorepo.

Then compile the installer with [Inno Setup 6](https://jrsoftware.org/isinfo.php):

```powershell
ISCC.exe installer\portixone.iss
```

Output: `installer\dist\PortixOneRuntimeSetup.exe`.

**Status**: compiled and verified end-to-end on this machine (silent install/reinstall/uninstall, service, tray, shortcuts — see below). Not verified: a machine with no Node.js/dev tools, and a real Windows restart — both need a human with a second machine or a reboot they've chosen to do, not something this was tested against here.

## What it does

1. Checks for Node.js on the target machine (fails with a clear message + link to nodejs.org if missing).
2. Copies the staged runtime + tray into `Program Files\PortixOne`.
3. Installs the Runtime as a Windows Service (`PortixOne Runtime`, auto-start, runs as `LocalSystem` — works without anyone logged in).
4. Adds a Start Menu shortcut and a Startup shortcut for the tray app, and launches the tray immediately.
5. Uninstalling kills the tray, removes the service, deletes every installed file (including what the running app generates afterwards — `.data/`, the service's log folder), and removes both shortcuts.

## Verified (`/VERYSILENT` installs on this machine)

- Fresh install → service running, `/health` responding, tray auto-launched, Start Menu + Startup shortcuts present.
- Reinstall over an existing install → service kept running under the same install, not duplicated.
- Uninstall → service gone, tray process gone, `Program Files\PortixOne` gone entirely, both shortcuts gone, `/health` unreachable.
- Along the way: a first uninstall pass left `runtime`/`tray` empty folders behind because the tray was still holding file handles open when file removal ran, and Inno Setup didn't reliably prune deeply nested now-empty directories on its own either way. Fixed with a `kill-tray.ps1` step ordered first in `[UninstallRun]`, plus explicit `[UninstallDelete]` entries.

## Not done yet

- Bundling a self-contained Node runtime (Node SEA or similar), so Node.js isn't a prerequisite.
- Real icon / visual identity (today's tray icon is a solid-color placeholder — see `tray/scripts/generate-placeholder-icon.js`).
- Code signing (unsigned installer — triggers SmartScreen warnings; `[Setup]` has a commented-out `SignTool` line ready for when a certificate exists).
- Auto-update (Milestone 2.6 in the roadmap).
