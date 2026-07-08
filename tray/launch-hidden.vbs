' Launches the PortixOne Tray with no visible console window.
'
' Windows shortcuts (.lnk) can only minimize a console app, not hide it —
' the underlying node.exe still flashes/appears in the taskbar as a black
' window a user can restore. WScript.Shell.Run with window style 0 is the
' actual way to suppress it, and wscript.exe itself never shows a window
' (it's a GUI-subsystem host, unlike node.exe).
'
' Paths are resolved relative to this script's own location rather than
' hardcoded, so the same file works unmodified from installer/staging/tray,
' the portable zip's tray/ folder, and the installed {app}\tray\ — all three
' share the same "tray/ next to node/" sibling layout.
Dim shell, fso, scriptDir, nodeExe, trayScript

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = scriptDir & "\..\node\node.exe"
trayScript = scriptDir & "\dist\index.js"

shell.Run """" & nodeExe & """ """ & trayScript & """", 0, False
