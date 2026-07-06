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

/** Loopback and RFC 1918 private ranges — never reachable from outside this machine's own network. */
const PRIVATE_IPV4 = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * A pairing request from localhost or a private-network origin never needs a
 * human to click "Allow" — the browser Origin already proves it's this
 * developer's own machine or LAN, the same trust boundary SSH gives
 * known-hosts on a private network. Anything else (a real public domain)
 * still goes through the normal approve flow.
 */
function isTrustedOrigin(origin?: string): boolean {
  if (!origin) {
    return false;
  }
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'localhost' || hostname === '::1' || PRIVATE_IPV4.test(hostname);
  } catch {
    return false;
  }
}

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
    const entry: PendingPairing = { tenant, appId, origin, expiresAt };
    this.pending.set(code, entry);
    if (isTrustedOrigin(origin)) {
      // No human ever sees this one — status() below already returns
      // 'approved' by the time the SDK's first poll comes in.
      this.approveEntry(entry);
    }
    return { code, expiresAt: new Date(expiresAt).toISOString() };
  }

  approve(code: string): PairingRecord {
    this.evictStale();
    const entry = this.pending.get(code);
    if (!entry || entry.expiresAt < Date.now()) {
      this.pending.delete(code);
      throw new PairingNotFoundError();
    }
    return this.approveEntry(entry);
  }

  /** Revokes a paired app immediately — any request using its token fails with INVALID_API_KEY from then on. */
  revoke(deviceId: string): boolean {
    return this.store.remove(deviceId);
  }

  /** Bumps a paired app's last-used timestamp — called on every authenticated request (see auth.service.ts). */
  touch(deviceId: string): void {
    this.store.touchLastUsed(deviceId);
  }

  private approveEntry(entry: PendingPairing): PairingRecord {
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
