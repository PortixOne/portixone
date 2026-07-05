import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { PrinterInfo } from '@portixone/protocol';

const execFileAsync = promisify(execFile);

interface RawPrinter {
  Name?: string;
  DriverName?: string;
  PortName?: string;
  PrinterStatus?: string;
}

export async function detectWindowsPrinters(): Promise<PrinterInfo[]> {
  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-Command',
      // PrinterStatus is a PowerShell enum object — without .ToString() it
      // serializes to its underlying integer, not a readable name.
      'Get-Printer | Select-Object Name, DriverName, PortName, @{Name="PrinterStatus";Expression={$_.PrinterStatus.ToString()}} | ConvertTo-Json -Compress',
    ]);

    const trimmed = stdout.trim();
    if (!trimmed) {
      return [];
    }

    const parsed = JSON.parse(trimmed) as RawPrinter | RawPrinter[];
    const printers = Array.isArray(parsed) ? parsed : [parsed];

    return printers
      .filter((printer): printer is Required<Pick<RawPrinter, 'Name'>> & RawPrinter => Boolean(printer?.Name))
      .map((printer) => ({
        name: printer.Name,
        driver: printer.DriverName,
        port: printer.PortName,
        status: printer.PrinterStatus,
        online: printer.PrinterStatus !== 'Offline',
      }));
  } catch {
    return [];
  }
}
