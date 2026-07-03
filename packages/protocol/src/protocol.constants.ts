export const PROTOCOL_VERSION = '0.1.0';

export const API_KEY_HEADER = 'x-portix-api-key';

export const WS_EVENTS = {
  STATUS: 'status',
  JOB_QUEUED: 'job:queued',
  JOB_PRINTED: 'job:printed',
  JOB_ERROR: 'job:error',
} as const;
