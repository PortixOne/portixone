/**
 * Device capabilities per the PortixOne capability model. Only PRINT is
 * implemented today — the rest are reserved names for future device types
 * (cash drawer, scale, ...) so the wire contract doesn't need to change shape
 * when they're added.
 */
export enum Capability {
  PRINT = 'PRINT',
  CUT = 'CUT',
  OPEN_DRAWER = 'OPEN_DRAWER',
  READ_WEIGHT = 'READ_WEIGHT',
}

export type JobStatus = 'queued' | 'printed' | 'error';

export interface PrintJob {
  content: string;
  printerName?: string;
  copies?: number;
}

export interface PrintJobResult {
  jobId: string;
  status: JobStatus;
  message?: string;
}

export interface RuntimeStatus {
  status: 'online';
  version: string;
  defaultPrinter?: string;
}
