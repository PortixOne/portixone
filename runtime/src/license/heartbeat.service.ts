import { GRACE, type LicenseRevocationNotice } from '@portixone/protocol';
import type { LoggerService } from '../logger/logger.service.js';
import type { LicenseService } from './license.service.js';

/** The minimal shape the heartbeat needs from `fetch` — injectable so tests need no network. */
type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface HeartbeatOptions {
  /**
   * The portix-cloud renewal endpoint. When UNSET the heartbeat is inert: the runtime simply
   * keeps its cached token and rides the offline-grace window. This is the correct default until
   * portix-cloud's token service (Phase C [cloud]) is live — no endpoint means no network attempt,
   * not a crash.
   */
  heartbeatUrl?: string;
  /** The public Application ID sent with the renewal request. */
  applicationId?: string;
  /** Cadence; defaults to the ratified 12h. Overridable for tests. */
  intervalMs?: number;
  /** Injectable for tests; defaults to global fetch (Node ≥20). */
  fetchImpl?: FetchLike;
}

interface RenewalResponse {
  /** A fresh signed token (the normal, positive case). */
  token?: string;
  /** An authenticated revocation contract (the recognized negative case). */
  revocation?: LicenseRevocationNotice;
}

/** True only for a body that exactly matches the recognized revocation contract. */
function isRevocationNotice(value: unknown): value is LicenseRevocationNotice {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    v.code === 'license_revoked' &&
    typeof v.applicationId === 'string' &&
    typeof v.effectiveAt === 'string' &&
    (v.installationId === undefined || typeof v.installationId === 'string')
  );
}

/**
 * Background license-token renewal (plan §4, Decision 2). Every ~12h it asks portix-cloud for a
 * fresh 48h token and hands it to LicenseService.applyToken. Four attempts fit inside one token
 * lifetime, so a couple of transient failures never exhaust the token before a later attempt
 * succeeds.
 *
 * ── NON-BLOCKING BY CONSTRUCTION ───────────────────────────────────────────────────────────
 * This runs on a timer, entirely off the print path. Every failure mode — endpoint unset,
 * network error, non-2xx, malformed body, a token the verifier rejects — is caught and logged,
 * never thrown. A renewal failure is not a print failure; the runtime keeps printing on its last
 * valid token through offline grace (plan §12 fundamental test).
 */
export class HeartbeatService {
  private timer?: ReturnType<typeof setInterval>;
  private readonly intervalMs: number;
  private readonly fetchImpl?: FetchLike;

  constructor(
    private readonly license: LicenseService,
    private readonly logger: LoggerService,
    private readonly options: HeartbeatOptions = {},
  ) {
    this.intervalMs = options.intervalMs ?? GRACE.HEARTBEAT_MS;
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike | undefined);
  }

  start(): void {
    if (!this.options.heartbeatUrl) {
      this.logger.info('License heartbeat disabled (no heartbeatUrl configured) — running on cached token only');
      return;
    }
    // `unref` so a pending heartbeat timer never keeps the process alive at shutdown.
    this.timer = setInterval(() => void this.runOnce(), this.intervalMs);
    this.timer.unref?.();
    this.logger.info('License heartbeat started', { intervalMs: this.intervalMs });
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** One renewal attempt. Public for tests and for an optional eager attempt at boot. */
  async runOnce(): Promise<boolean> {
    const { heartbeatUrl, applicationId } = this.options;
    if (!heartbeatUrl || !this.fetchImpl) {
      return false;
    }
    try {
      const current = this.license.getState();
      const response = await this.fetchImpl(heartbeatUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          applicationId: applicationId ?? current.applicationId,
          installationId: current.claims?.installationId,
        }),
      });
      if (!response.ok) {
        // A 401/403/500 is NOT a revocation — it can be a proxy, a WAF, a misroute, or a Portal
        // bug. Never interpret transport-level negatives as "revoked"; conserve the cached token.
        this.logger.warn('License heartbeat got a non-OK response — staying on cached token', {
          status: response.status,
        });
        return false;
      }
      const body = (await response.json()) as RenewalResponse;

      // Recognized negative: an authenticated revocation contract, and ONLY over TLS from the
      // configured endpoint. Anything less specific conserves state (best-effort).
      if (isRevocationNotice(body.revocation)) {
        if (!heartbeatUrl.startsWith('https://')) {
          this.logger.warn('Ignored a revocation delivered over a non-TLS heartbeat URL');
          return false;
        }
        return this.license.applyRevocation(body.revocation);
      }

      if (!body.token) {
        // Unknown-but-OK JSON (no token, no recognized revocation): conserve, don't guess.
        this.logger.warn('License heartbeat response carried no token or recognized revocation — staying on cached token');
        return false;
      }
      return this.license.applyToken(body.token);
    } catch (error) {
      // Offline / DNS failure / Portal down: exactly the technical-grace case. Log and ride it.
      this.logger.warn('License heartbeat failed — staying on cached token (offline grace)', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
