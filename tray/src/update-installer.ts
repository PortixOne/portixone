import { createWriteStream } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

/**
 * Downloads the installer asset and launches it silently. Uses the same
 * `/VERYSILENT /CLOSEAPPLICATIONS /FORCECLOSEAPPLICATIONS` flags documented
 * in installer/README.md for a scripted install over a running tray/service
 * — the installer's own `PrepareToInstall` step (portixone.iss) already
 * kills this tray process and the [Run] section relaunches it after
 * reinstalling, so nothing more needs to happen here once it's spawned.
 */
export async function downloadAndRunInstaller(downloadUrl: string): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'portix-update-'));
  const installerPath = join(dir, 'PortixOneRuntimeSetup.exe');

  const response = await fetch(downloadUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download installer (${response.status})`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(installerPath));

  spawn(installerPath, ['/VERYSILENT', '/CLOSEAPPLICATIONS', '/FORCECLOSEAPPLICATIONS'], {
    detached: true,
    stdio: 'ignore',
  }).unref();
}
