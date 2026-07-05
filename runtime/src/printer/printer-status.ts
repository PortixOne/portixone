import { PaperOutError, PrinterBusyError, PrinterNotReadyError, PrinterOfflineError } from '@portixone/shared';

/** Windows' Get-Printer PrinterStatus values that mean "another job has it occupied" rather than a hardware fault. */
const BUSY_STATUSES = new Set(['Busy', 'Printing', 'Processing', 'Waiting']);

/**
 * Maps a Windows `Get-Printer` status string to a specific, human-readable
 * error — or does nothing if the printer looks ready. This exists because
 * `winspool.drv`'s `WritePrinter` (used by windows-spooler.driver.ts) can
 * report success even when the physical printer is offline or out of paper —
 * the spooler just queues the job — so this is the only way to catch those
 * conditions before a job "succeeds" but nothing comes out.
 */
export function assertPrinterStatusReady(status: string | undefined): void {
  if (status === undefined || status === 'Normal') {
    return;
  }
  if (status === 'Offline') {
    throw new PrinterOfflineError();
  }
  if (status === 'PaperOut') {
    throw new PaperOutError();
  }
  if (BUSY_STATUSES.has(status)) {
    throw new PrinterBusyError();
  }
  throw new PrinterNotReadyError(status);
}
