import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PrintJobInput } from '@portixone/protocol';
import { EscposBuilder } from '@portixone/escpos';
import { PrinterConnectionError, PrinterNotFoundError } from '@portixone/shared';
import type { PrinterDriver } from './printer-driver.types.js';

const execFileAsync = promisify(execFile);

const SCRIPT_PATH = fileURLToPath(new URL('../../../scripts/send-raw-print.ps1', import.meta.url));

/**
 * Sends raw ESC/POS bytes to a USB thermal printer installed as a named
 * Windows printer, via winspool.drv (through a PowerShell P/Invoke helper —
 * see scripts/send-raw-print.ps1). No native Node addon / node-gyp needed.
 */
export class WindowsSpoolerPrinterDriver implements PrinterDriver {
  constructor(private readonly defaultPrinterName?: string) {}

  async print(job: PrintJobInput): Promise<void> {
    const printerName = job.printerName ?? this.defaultPrinterName;
    if (!printerName) {
      throw new PrinterNotFoundError();
    }

    const buffer = new EscposBuilder().text(job.content).feed(3).cut().build();
    const copies = job.copies ?? 1;

    const dir = await mkdtemp(join(tmpdir(), 'portix-print-'));
    const dataFile = join(dir, 'job.bin');
    try {
      await writeFile(dataFile, buffer);
      for (let i = 0; i < copies; i += 1) {
        await this.sendToSpooler(printerName, dataFile);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async sendToSpooler(printerName: string, dataFile: string): Promise<void> {
    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        SCRIPT_PATH,
        '-PrinterName',
        printerName,
        '-DataFile',
        dataFile,
      ]);
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes('OpenPrinter failed')) {
        throw new PrinterNotFoundError(printerName);
      }
      throw new PrinterConnectionError(message);
    }
  }
}
