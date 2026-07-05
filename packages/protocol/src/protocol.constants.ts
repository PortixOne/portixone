/**
 * Bumped to 0.2.0: `JobStatus` values changed shape (queued/printed/error →
 * pending/printing/completed/failed/cancelled) as part of Milestone 3's
 * Local API + queue work — a breaking wire change pre-1.0.
 */
export const PROTOCOL_VERSION = '0.2.0';

export const API_KEY_HEADER = 'x-portix-api-key';

export const WS_EVENTS = {
  STATUS: 'status',
  JOB_QUEUED: 'job:queued',
  JOB_PRINTING: 'job:printing',
  JOB_PRINTED: 'job:printed',
  JOB_ERROR: 'job:error',
  JOB_CANCELLED: 'job:cancelled',
} as const;
