# Run by the uninstaller before file removal — the tray app has no IPC quit
# hook from the outside, so this is the only reliable way to stop it before
# Windows Installer tries (and fails) to delete files it still has open.
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like '*PortixOne*tray*index.js*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
