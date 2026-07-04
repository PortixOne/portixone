; PortixOne Runtime installer.
;
; Prerequisite: run `node installer/build-staging.js` from the repo root
; first — this script packages installer/staging/, not the source tree.
;
; Requires Node.js already installed on the target machine (checked below).
; Bundling a self-contained Node runtime (e.g. via Node's Single Executable
; Applications) is a follow-up, not done here — see ROADMAP.md.
;
; Compile with Inno Setup 6 (https://jrsoftware.org/isinfo.php):
;   ISCC.exe installer\portixone.iss

#define MyAppName "PortixOne Runtime"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "PortixOne"
#define MyAppURL "https://portix.dev"
#define ServiceDisplayName "PortixOne Runtime"

[Setup]
AppId={{9F2C6E1A-6B3D-4E7F-8A2B-PORTIXONE01}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\PortixOne
DefaultGroupName=PortixOne
DisableProgramGroupPage=yes
OutputDir=dist
OutputBaseFilename=PortixOneRuntimeSetup
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
UninstallDisplayIcon={app}\tray\assets\icon.ico
SetupIconFile=..\tray\assets\icon.ico
VersionInfoVersion={#MyAppVersion}
VersionInfoProductName={#MyAppName}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Setup
VersionInfoCopyright=Copyright (C) 2026 {#MyAppPublisher}
; SignTool=... — no code signing certificate yet (unsigned installers trigger
; SmartScreen warnings). Uncomment and configure once one exists:
; SignTool=signtool sign /fd SHA256 /a $f

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
FinishedLabel=PortixOne Runtime is ready. Your computer can now receive print jobs from applications using PortixOne.%n%nWindows Service installed%nRuntime started%nReady to receive print jobs%n%nVersion {#MyAppVersion}
ClickFinish=

[Files]
Source: "staging\runtime\*"; DestDir: "{app}\runtime"; Flags: recursesubdirs ignoreversion
Source: "staging\tray\*"; DestDir: "{app}\tray"; Flags: recursesubdirs ignoreversion
Source: "kill-tray.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\PortixOne Tray"; Filename: "{code:GetNodePath}"; Parameters: """{app}\tray\dist\index.js"""; WorkingDir: "{app}\tray"; IconFilename: "{app}\tray\assets\icon.ico"
Name: "{userstartup}\PortixOne Tray"; Filename: "{code:GetNodePath}"; Parameters: """{app}\tray\dist\index.js"""; WorkingDir: "{app}\tray"; IconFilename: "{app}\tray\assets\icon.ico"

[Run]
Filename: "{code:GetNodePath}"; Parameters: """{app}\runtime\scripts\service.install.js"""; WorkingDir: "{app}\runtime"; StatusMsg: "Installing the PortixOne Runtime service..."; Flags: runhidden waituntilterminated
; (Any previous tray instance is already killed in PrepareToInstall, above —
; before Setup even gets here — so this always launches exactly one.)
; Deliberately NOT using the `postinstall` flag: that ties this to the
; interactive Finished-page checkbox, which doesn't exist under
; /VERYSILENT — tested repeatedly, and the tray never launched that way.
; The product goal is "operational with no further intervention" even for
; a silent/scripted deployment, so this is just an unconditional step.
Filename: "{code:GetNodePath}"; Parameters: """{app}\tray\dist\index.js"""; WorkingDir: "{app}\tray"; Flags: nowait runhidden

[UninstallRun]
; Order matters: kill the tray first so it isn't holding file handles open
; when uninstall gets to removing {app}\tray (found the hard way — a first
; test left runtime/tray folders behind because the tray was still running).
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\kill-tray.ps1"""; Flags: runhidden waituntilterminated; RunOnceId: "KillTray"
Filename: "{code:GetNodePath}"; Parameters: """{app}\runtime\scripts\service.uninstall.js"""; WorkingDir: "{app}\runtime"; Flags: runhidden waituntilterminated; RunOnceId: "UninstallService"

[UninstallDelete]
; Files the runtime/service create after install (config, logs, the
; node-windows daemon wrapper) — Inno Setup only auto-removes what it
; installed, not what the app generated afterwards.
Type: filesandordirs; Name: "{app}\runtime\.data"
Type: filesandordirs; Name: "{app}\runtime\scripts\daemon"
; Belt-and-suspenders: confirmed by testing that Inno Setup's own file
; tracking doesn't reliably prune deeply nested now-empty directory
; chains (found tray\node_modules\systray2\traybin left behind, empty,
; after a real uninstall run) — {app}\runtime and {app}\tray are 100%
; ours, so force them gone rather than trying to enumerate every nested
; empty dir individually.
Type: filesandordirs; Name: "{app}\runtime"
Type: filesandordirs; Name: "{app}\tray"
Type: dirifempty; Name: "{app}"

[Code]
var
  NodePath: string;

function GetNodePath(Param: string): string;
begin
  Result := NodePath;
end;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
  RawOutput: AnsiString;
  LineBreakPos: Integer;
begin
  if not Exec('cmd.exe', '/c where node > "' + ExpandConstant('{tmp}') + '\node-where.txt" 2>nul',
     '', SW_HIDE, ewWaitUntilTerminated, ResultCode) or (ResultCode <> 0) then
  begin
    MsgBox('Node.js was not found on this machine (checked via "where node"). ' +
      'Install Node.js 20 or later from https://nodejs.org first, then run this installer again.',
      mbCriticalError, MB_OK);
    Result := False;
    exit;
  end;

  LoadStringFromFile(ExpandConstant('{tmp}') + '\node-where.txt', RawOutput);
  NodePath := Trim(String(RawOutput));
  // "where node" prints one match per line — only the first one if there are several.
  LineBreakPos := Pos(#13, NodePath);
  if LineBreakPos > 0 then
    NodePath := Copy(NodePath, 1, LineBreakPos - 1);
  Result := True;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
  KillScript: String;
begin
  // Reinstalling/upgrading over a running tray otherwise trips Inno Setup's
  // own Restart Manager "files in use" prompt (found by testing a real
  // reinstall while the tray was open) — kill it here, before Setup checks
  // for locked files, instead of relying on [Run] (which only executes
  // after that check already happened) or the interactive prompt.
  //
  // Calls the already-installed kill-tray.ps1 (present from any prior
  // install — this only matters on a reinstall, since a first-ever install
  // has no tray running yet) rather than inlining the same filter here:
  // an earlier version embedded the search pattern directly in this
  // process's own -Command string, which made it match and kill *itself*
  // mid-execution — found the hard way when repeated installs hung.
  KillScript := ExpandConstant('{app}') + '\kill-tray.ps1';
  if FileExists(KillScript) then
    Exec('powershell.exe', '-NoProfile -ExecutionPolicy Bypass -File "' + KillScript + '"',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := '';
  NeedsRestart := False;
end;
