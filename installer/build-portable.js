import { cpSync, rmSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// Packages installer/staging/{node,runtime,tray} — already built by
// build-staging.js — into a no-install, no-admin, no-Windows-Service zip.
// Unlike PortixOneRuntimeSetup.exe, this doesn't survive a reboot or run
// without a logged-in user; it's for quick local testing or environments
// where installing a service isn't wanted. See ROADMAP.md Fase 4.
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const stagingDir = join(rootDir, 'installer', 'staging');
const distDir = join(rootDir, 'installer', 'dist');
const portableDir = join(distDir, 'PortixOneRuntimePortable');

if (!existsSync(join(stagingDir, 'node', 'node.exe'))) {
  throw new Error('installer/staging is missing or incomplete — run `node installer/build-staging.js` first.');
}

rmSync(portableDir, { recursive: true, force: true });
mkdirSync(portableDir, { recursive: true });

for (const dir of ['node', 'runtime', 'tray']) {
  cpSync(join(stagingDir, dir), join(portableDir, dir), { recursive: true });
}

writeFileSync(
  join(portableDir, 'Start PortixOne.bat'),
  [
    '@echo off',
    'cd /d "%~dp0runtime"',
    'start "PortixOne Runtime" /min ..\\node\\node.exe --env-file-if-exists=.env dist\\index.js',
    'cd /d "%~dp0tray"',
    // wscript.exe + launch-hidden.vbs, not node.exe directly — a console
    // window can only be minimized, not hidden, so it'd flash and sit in
    // the taskbar. See tray/launch-hidden.vbs for why.
    'wscript.exe launch-hidden.vbs',
    '',
  ].join('\r\n'),
);

writeFileSync(
  join(portableDir, 'README.txt'),
  [
    'PortixOne Runtime -- Portable',
    '',
    'No installation, no admin rights, no Windows Service -- everything here',
    'runs directly out of this folder using the bundled Node.js runtime.',
    '',
    'To start: double-click "Start PortixOne.bat". One minimized console',
    'window opens for the Runtime; the Tray runs fully hidden in the',
    'background -- look for its icon in the system tray (you may need to',
    'click the "^" arrow to see hidden icons).',
    'To stop: close the Runtime window, and use the tray icon\'s "Close',
    'Tray" menu item (or end both from Task Manager).',
    '',
    'This does NOT auto-start on boot and does NOT run without a user',
    'logged in. For that, use PortixOneRuntimeSetup.exe instead, which',
    'registers a proper Windows Service.',
  ].join('\r\n'),
);

const zipPath = join(distDir, 'PortixOneRuntimePortable.zip');
rmSync(zipPath, { force: true });
execFileSync('powershell.exe', [
  '-NoProfile',
  '-Command',
  `Compress-Archive -Path "${portableDir}\\*" -DestinationPath "${zipPath}" -Force`,
]);

console.log(`\nPortable build complete: ${zipPath}`);
