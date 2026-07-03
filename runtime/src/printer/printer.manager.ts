import type { PrintJobInput, PrintJobResult } from '@portixone/protocol';
import { PrinterNotFoundError } from '@portixone/shared';
import { detectWindowsPrinters } from './detectors/windows.detector.js';
import { MockPrinterDriver } from './drivers/mock.driver.js';
import { NetworkPrinterDriver } from './drivers/network.driver.js';
import { WindowsSpoolerPrinterDriver } from './drivers/windows-spooler.driver.js';
import type { PrinterDriver } from './drivers/printer-driver.types.js';
import type { RuntimeConfig } from '../config/config.types.js';
import type { LoggerService } from '../logger/logger.service.js';

function createDriver(config: RuntimeConfig, logger: LoggerService): PrinterDriver {
  switch (config.printerDriver) {
    case 'network':
      if (!config.networkPrinterHost) {
        throw new Error('PORTIX_NETWORK_PRINTER_HOST is required when printerDriver is "network"');
      }
      return new NetworkPrinterDriver(config.networkPrinterHost, config.networkPrinterPort);
    case 'windows-spooler':
      return new WindowsSpoolerPrinterDriver(config.defaultPrinter);
    case 'mock':
    default:
      return new MockPrinterDriver(logger);
  }
}

export class PrinterManager {
  private readonly driver: PrinterDriver;
  private readonly driverType: RuntimeConfig['printerDriver'];

  constructor(config: RuntimeConfig, logger: LoggerService) {
    this.driver = createDriver(config, logger);
    this.driverType = config.printerDriver;
  }

  async listPrinters(): Promise<string[]> {
    return detectWindowsPrinters();
  }

  async print(jobId: string, job: PrintJobInput): Promise<PrintJobResult> {
    if (this.driverType === 'windows-spooler' && job.printerName) {
      const available = await this.listPrinters();
      if (available.length > 0 && !available.includes(job.printerName)) {
        throw new PrinterNotFoundError(job.printerName);
      }
    }

    await this.driver.print(job);
    return { jobId, status: 'printed' };
  }
}
