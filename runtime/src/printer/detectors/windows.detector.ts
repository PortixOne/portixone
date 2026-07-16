import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { PrinterInfo } from '@portixone/protocol';

const execFileAsync = promisify(execFile);

interface RawPrinter {
  Name?: string;
  DriverName?: string;
  PortName?: string;
  PrinterStatus?: string;
  WorkOffline?: boolean;
}

/**
 * `Win32_Printer.WorkOffline` is the reliable disconnect signal for
 * "Generic / Text Only" USB thermal printers, whose `Get-Printer`
 * `PrinterStatus` wrongly stays "Normal" when the device is powered off or
 * unplugged (confirmed on the SICAR WL88S, 2026-07-14 — the spooler then
 * accepts the job and it prints late on reconnect, so a print reports a false
 * "completed"). Mapping WorkOffline to "Offline" lets the print-time
 * pre-flight (`assertPrinterStatusReady` → `PrinterOfflineError`) fail
 * honestly instead. Kept as a pure function so the mapping is unit-testable.
 */
export function effectivePrinterStatus(rawStatus: string | undefined, workOffline: boolean | undefined): string | undefined {
  if (workOffline) {
    return 'Offline';
  }
  return rawStatus;
}

export async function detectWindowsPrinters(): Promise<PrinterInfo[]> {
  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      // Get-Printer gives the readable status string, but for Generic/Text-Only
      // USB printers it lies when the device is gone — so also pull WorkOffline
      // from Win32_Printer (the signal that stays truthful) and let the JS side
      // combine them. PrinterStatus is an enum object; .ToString() keeps it a
      // readable name instead of its underlying integer.
      '$wo=@{}; Get-CimInstance Win32_Printer | ForEach-Object { $wo[$_.Name]=[bool]$_.WorkOffline }; ' +
        "Get-Printer | Select-Object Name, DriverName, PortName, " +
        "@{Name='PrinterStatus';Expression={$_.PrinterStatus.ToString()}}, " +
        "@{Name='WorkOffline';Expression={[bool]$wo[$_.Name]}} | ConvertTo-Json -Compress",
    ]);

    const trimmed = stdout.trim();
    if (!trimmed) {
      return [];
    }

    const parsed = JSON.parse(trimmed) as RawPrinter | RawPrinter[];
    const printers = Array.isArray(parsed) ? parsed : [parsed];

    return printers
      .filter((printer): printer is Required<Pick<RawPrinter, 'Name'>> & RawPrinter => Boolean(printer?.Name))
      .map((printer) => {
        const status = effectivePrinterStatus(printer.PrinterStatus, printer.WorkOffline);
        return {
          name: printer.Name,
          driver: printer.DriverName,
          port: printer.PortName,
          status,
          online: status !== 'Offline',
        };
      });
  } catch {
    return [];
  }
}
