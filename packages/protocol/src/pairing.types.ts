/** A capability an app is allowed to use against a paired device. Only `print` exists today. */
export type Permission = 'print';

/** A completed pairing — persisted by the runtime, never re-requested once approved. */
export interface PairingRecord {
  tenant: string;
  appId: string;
  deviceId: string;
  token: string;
  /** The `Origin` header captured at request time, if the caller was a browser. Pinned for future requests. */
  origin?: string;
  permissions: Permission[];
  pairedAt: string;
  /** How long the request sat waiting for a human to approve it — computed once at approval, for the pairing-time metric (Milestone 4). */
  pairingDurationMs: number;
}

export interface PairingRequestResult {
  code: string;
  expiresAt: string;
}

export type PairingStatus = 'pending' | 'approved' | 'expired';

export interface PairingStatusResult {
  status: PairingStatus;
  token?: string;
  deviceId?: string;
  permissions?: Permission[];
}

/** Admin-facing view of a pairing — token is never included. */
export type PairedAppSummary = Omit<PairingRecord, 'token'>;

/** A pairing request awaiting a human's approval — e.g. shown in the tray's Pairing Requests menu. */
export interface PendingPairingSummary {
  code: string;
  tenant: string;
  appId: string;
  expiresAt: string;
}
