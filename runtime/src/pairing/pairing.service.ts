import { randomUUID } from 'node:crypto';
import type {
  PairingRecord,
  PairingRequestResult,
  PairingStatusResult,
  PendingPairingSummary,
  Permission,
} from '@portixone/protocol';
import { PairingNotFoundError } from '@portixone/shared';
import { PairingStore } from './pairing.store.js';

/** Excludes visually ambiguous characters (0/O, 1/I) — this code gets typed by a human. */
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_TTL_MS = 5 * 60 * 1000;
/** How long an approved code stays queryable via status() before the pending entry is dropped. */
const APPROVED_GRACE_MS = 2 * 60 * 1000;
const DEFAULT_PERMISSIONS: Permission[] = ['print'];

interface PendingPairing {
  tenant: string;
  appId: string;
  origin?: string;
  expiresAt: number;
  approved?: { token: string; deviceId: string; permissions: Permission[]; approvedAt: number };
}

function generateCode(): string {
  const segment = (): string =>
    Array.from({ length: 4 }, () => CODE_CHARSET[Math.floor(Math.random() * CODE_CHARSET.length)]).join('');
  return `${segment()}-${segment()}`;
}

/**
 * Pairing codes live only in memory (they're single-use and short-lived) —
 * only approved pairings are persisted, via `PairingStore`.
 */
export class PairingService {
  private readonly pending = new Map<string, PendingPairing>();

  constructor(private readonly store: PairingStore) {}

  request(tenant: string, appId: string, origin?: string): PairingRequestResult {
    this.evictStale();
    const code = generateCode();
    const expiresAt = Date.now() + CODE_TTL_MS;
    this.pending.set(code, { tenant, appId, origin, expiresAt });
    return { code, expiresAt: new Date(expiresAt).toISOString() };
  }

  approve(code: string): PairingRecord {
    this.evictStale();
    const entry = this.pending.get(code);
    if (!entry || entry.expiresAt < Date.now()) {
      this.pending.delete(code);
      throw new PairingNotFoundError();
    }

    const requestedAt = entry.expiresAt - CODE_TTL_MS;
    const record: PairingRecord = {
      tenant: entry.tenant,
      appId: entry.appId,
      deviceId: randomUUID(),
      token: randomUUID(),
      origin: entry.origin,
      permissions: DEFAULT_PERMISSIONS,
      pairedAt: new Date().toISOString(),
      pairingDurationMs: Date.now() - requestedAt,
    };

    this.store.add(record);
    entry.approved = {
      token: record.token,
      deviceId: record.deviceId,
      permissions: record.permissions,
      approvedAt: Date.now(),
    };
    return record;
  }

  status(code: string): PairingStatusResult {
    this.evictStale();
    const entry = this.pending.get(code);
    if (!entry) {
      throw new PairingNotFoundError();
    }
    if (entry.approved) {
      return {
        status: 'approved',
        token: entry.approved.token,
        deviceId: entry.approved.deviceId,
        permissions: entry.approved.permissions,
      };
    }
    if (entry.expiresAt < Date.now()) {
      return { status: 'expired' };
    }
    return { status: 'pending' };
  }

  findByToken(token: string): PairingRecord | undefined {
    return this.store.findByToken(token);
  }

  listPaired(): PairingRecord[] {
    return this.store.list();
  }

  /** Requests waiting on a human to approve them — what the tray's Pairing Requests menu polls. */
  listPending(): PendingPairingSummary[] {
    this.evictStale();
    return [...this.pending.entries()]
      .filter(([, entry]) => !entry.approved)
      .map(([code, entry]) => ({
        code,
        tenant: entry.tenant,
        appId: entry.appId,
        expiresAt: new Date(entry.expiresAt).toISOString(),
      }));
  }

  private evictStale(): void {
    const now = Date.now();
    for (const [code, entry] of this.pending) {
      const unapprovedAndExpired = !entry.approved && entry.expiresAt < now;
      const approvedPastGrace = entry.approved !== undefined && entry.approved.approvedAt + APPROVED_GRACE_MS < now;
      if (unapprovedAndExpired || approvedPastGrace) {
        this.pending.delete(code);
      }
    }
  }
}
