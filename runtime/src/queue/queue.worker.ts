import type { PrintJobInput } from '@portixone/protocol';
import type { LoggerService } from '../logger/logger.service.js';
import type { PrinterManager } from '../printer/printer.manager.js';

export type JobOutcome = { status: 'completed' } | { status: 'failed'; message: string };

/**
 * Executes exactly one print job against the PrinterManager. Knows nothing
 * about queue ordering, ownership, or persistence — QueueService owns all of
 * that and calls `run()` one job at a time.
 */
export class QueueWorker {
  private busy = false;

  constructor(
    private readonly printerManager: PrinterManager,
    private readonly logger: LoggerService,
  ) {}

  isBusy(): boolean {
    return this.busy;
  }

  async run(jobId: string, job: PrintJobInput): Promise<JobOutcome> {
    this.busy = true;
    try {
      await this.printerManager.print(job);
      return { status: 'completed' };
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error('Print job failed', { jobId, error: message });
      return { status: 'failed', message };
    } finally {
      this.busy = false;
    }
  }
}
