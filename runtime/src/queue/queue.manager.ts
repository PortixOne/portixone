import { randomUUID } from 'node:crypto';
import { WS_EVENTS, type PrintJobInput, type PrintJobResult } from '@portixone/protocol';
import type { LoggerService } from '../logger/logger.service.js';
import type { PrinterManager } from '../printer/printer.manager.js';
import type { WebSocketManager } from '../api/websocket.manager.js';

interface QueuedJob {
  jobId: string;
  job: PrintJobInput;
}

export class QueueManager {
  private queue: QueuedJob[] = [];
  private processing = false;
  private wsManager?: WebSocketManager;

  constructor(
    private readonly printerManager: PrinterManager,
    private readonly logger: LoggerService,
  ) {}

  attachWebSocketManager(wsManager: WebSocketManager): void {
    this.wsManager = wsManager;
  }

  enqueue(job: PrintJobInput): PrintJobResult {
    const jobId = randomUUID();
    this.queue.push({ jobId, job });
    this.wsManager?.broadcast(WS_EVENTS.JOB_QUEUED, { jobId });
    void this.processNext();
    return { jobId, status: 'queued' };
  }

  private async processNext(): Promise<void> {
    if (this.processing) {
      return;
    }
    const next = this.queue.shift();
    if (!next) {
      return;
    }

    this.processing = true;
    try {
      const result = await this.printerManager.print(next.jobId, next.job);
      this.wsManager?.broadcast(WS_EVENTS.JOB_PRINTED, result);
    } catch (error) {
      this.logger.error('Print job failed', {
        jobId: next.jobId,
        error: (error as Error).message,
      });
      this.wsManager?.broadcast(WS_EVENTS.JOB_ERROR, {
        jobId: next.jobId,
        message: (error as Error).message,
      });
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        void this.processNext();
      }
    }
  }
}
