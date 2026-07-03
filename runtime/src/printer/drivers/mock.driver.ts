import type { PrintJobInput } from '@portixone/protocol';
import type { LoggerService } from '../../logger/logger.service.js';
import type { PrinterDriver } from './printer-driver.types.js';

/**
 * Logs the job as printed instead of talking to real hardware. Useful for
 * local dev without a physical printer attached — see network.driver.ts and
 * windows-spooler.driver.ts for real drivers.
 */
export class MockPrinterDriver implements PrinterDriver {
  constructor(private readonly logger: LoggerService) {}

  async print(job: PrintJobInput): Promise<void> {
    this.logger.info('Printed (mock driver)', {
      printerName: job.printerName ?? 'default',
      copies: job.copies ?? 1,
      contentPreview: job.content.slice(0, 80),
    });
  }
}
