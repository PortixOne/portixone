import type { PrintJobInput } from '@portixone/protocol';
import type { LoggerService } from '../../logger/logger.service.js';

/**
 * MVP stub — logs the job as printed instead of talking to real hardware.
 * Real ESC/POS + Windows spooler integration is the next iteration
 * (packages/escpos already builds the byte commands this driver will send).
 */
export class MockPrinterDriver {
  constructor(private readonly logger: LoggerService) {}

  async print(job: PrintJobInput): Promise<void> {
    this.logger.info('Printed (mock driver)', {
      printerName: job.printerName ?? 'default',
      copies: job.copies ?? 1,
      contentPreview: job.content.slice(0, 80),
    });
  }
}
