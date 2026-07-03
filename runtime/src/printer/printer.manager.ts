import type { PrintJobInput, PrintJobResult } from '@portixone/protocol';
import { PrinterNotFoundError } from '@portixone/shared';
import { detectWindowsPrinters } from './detectors/windows.detector.js';
import { MockPrinterDriver } from './drivers/mock.driver.js';
import type { LoggerService } from '../logger/logger.service.js';

export class PrinterManager {
  private readonly driver: MockPrinterDriver;

  constructor(logger: LoggerService) {
    this.driver = new MockPrinterDriver(logger);
  }

  async listPrinters(): Promise<string[]> {
    return detectWindowsPrinters();
  }

  async print(jobId: string, job: PrintJobInput): Promise<PrintJobResult> {
    const available = await this.listPrinters();
    if (job.printerName && available.length > 0 && !available.includes(job.printerName)) {
      throw new PrinterNotFoundError(job.printerName);
    }

    await this.driver.print(job);
    return { jobId, status: 'printed' };
  }
}
