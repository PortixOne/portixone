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

## Silent / scripted installs

Always pass `/CLOSEAPPLICATIONS /FORCECLOSEAPPLICATIONS` alongside `/VERYSILENT /SUPPRESSMSGBOXES`:

```powershell
PortixOneRuntimeSetup.exe /VERYSILENT /SUPPRESSMSGBOXES /CLOSEAPPLICATIONS /FORCECLOSEAPPLICATIONS
```

Without them, if the tray happens to be running (reinstalling/upgrading over an existing install), Inno Setup's Restart Manager shows an interactive "these applications need to close" prompt — which just hangs forever with no window to click in a silent/unattended run. An interactive (double-clicked) install still shows this dialog if the tray is running, but it's a normal one-click "Next" with "Automatically close" pre-selected — not a bug, just expected Windows Installer behavior.

## What it does

1. Checks for Node.js on the target machine (fails with a clear message + link to nodejs.org if missing).
2. Copies the staged runtime + tray into `Program Files\PortixOne`.
3. Installs the Runtime as a Windows Service (`PortixOne Runtime`, auto-start, runs as `LocalSystem` — works without anyone logged in).
4. Adds a Start Menu shortcut and a Startup shortcut for the tray app, and launches the tray — unconditionally, not tied to the interactive Finished-page checkbox (see below for why).
5. Uninstalling kills the tray, removes the service, deletes every installed file (including what the running app generates afterwards — `.data/`, the service's log folder), and removes both shortcuts.

## Verified (`/VERYSILENT` installs on this machine)

- Fresh install → service running, `/health` responding, tray launched, Start Menu + Startup shortcuts present.
- Reinstall over an existing install, including with the tray actively running → service kept running under the same install (not duplicated), exactly one tray process afterwards (not stacked).
- Uninstall → service gone, tray process gone, `Program Files\PortixOne` gone entirely, both shortcuts gone, `/health` unreachable.

## Bugs found by actually testing this, not by reading the script

- **Tray held file handles open during uninstall.** A first uninstall pass left `runtime`/`tray` empty folders behind because the tray was still running when file removal ran. Fixed: `kill-tray.ps1` runs first in `[UninstallRun]`.
- **Inno Setup didn't prune deeply nested empty directories on its own** (`tray\node_modules\systray2\traybin` survived, empty, after a real uninstall). Fixed: `{app}\runtime` and `{app}\tray` are entirely ours, so `[UninstallDelete]` force-removes them outright instead of relying on that.
- **Reinstalling over a running tray stacked duplicate processes** — each `[Run]` entry launch is unconditional, so without killing the old one first, a second reinstall produced two tray processes, a third produced three, etc. Fixed: `PrepareToInstall` in `[Code]` kills any existing tray before Setup does anything else.
- **The kill command matched and killed itself.** The first version of that `PrepareToInstall` fix ran an inline PowerShell filter (`Where-Object CommandLine -like '*tray*index.js*'`) — but the filter *pattern itself*, spelled out in the invoking process's own command line, matched that same process, which then killed itself mid-run and hung the elevated installer waiting on it. Fixed by calling the standalone `kill-tray.ps1` file instead (its own invocation — `-File "...\kill-tray.ps1"` — doesn't contain `index.js`, so it can't self-match).
- **`postinstall`-flagged `[Run]` entries are unreliable under `/VERYSILENT`.** That flag ties an entry to the interactive Finished-page checkbox; under `/VERYSILENT` there's no such page, and whether it still ran was inconsistent test to test. The tray launch is now a plain unconditional `[Run]` entry instead, since the product goal ("operational with no further intervention") should hold for silent/scripted deployments too.
- **The Restart Manager "files in use" prompt still isn't fully suppressed by `/SUPPRESSMSGBOXES`** — see "Silent / scripted installs" above. `/CLOSEAPPLICATIONS /FORCECLOSEAPPLICATIONS` is the actual fix; `PrepareToInstall` killing the tray early reduces how often it's needed but doesn't replace it.

## Not done yet

- Bundling a self-contained Node runtime (Node SEA or similar), so Node.js isn't a prerequisite.
- Real icon / visual identity (today's tray icon is a solid-color placeholder — see `tray/scripts/generate-placeholder-icon.js`). Deliberate tech debt until PortixOne has real brand assets.
- Custom wizard imagery and Finished-page copy beyond the `FinishedLabel` override already in place — same reason, no visual assets yet.
- Code signing (unsigned installer — triggers SmartScreen warnings; `[Setup]` has a commented-out `SignTool` line ready for when a certificate exists).
- A local Dashboard (localhost) showing status/printers/queue/logs — flagged in review as a bigger follow-up, not a tray menu rename. See ROADMAP.
- Auto-update (Milestone 2.6 in the roadmap).
