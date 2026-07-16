import { createPublicKey, verify as cryptoVerify, type KeyObject } from 'node:crypto';
import {
  GRACE,
  type LicenseTokenClaims,
  type LicenseTokenHeader,
  type LicenseVerificationResult,
  type RuntimePublicKeyring,
} from '@portixone/protocol';

export interface VerifyOptions {
  /** Injectable clock for deterministic expiry tests; defaults to Date.now(). */
  now?: number;
  /**
   * The Application ID this runtime is deployed as. When set, a token whose `applicationId`/`sub`
   * doesn't match is rejected (`application_mismatch`) — a valid token for App X must not authorize
   * a runtime configured as App Y. Omit for a bare dev runtime with no registered Application.
   */
  expectedApplicationId?: string;
}

/**
 * Offline ES256 verification of a license token (Decision 1, ratified). Zero external deps —
 * Node's `crypto` verifies ECDSA P-256 / SHA-256 natively. The token is a standard compact JWS
 * (`header.payload.signature`, all base64url); the signature is JOSE-format raw R‖S (64 bytes),
 * which `crypto.verify` accepts via `dsaEncoding: 'ieee-p1363'` (its default DER form would
 * reject a JOSE signature).
 *
 * This runs at boot and on every heartbeat swap — never on the print hot path. It performs NO
 * network I/O: the only inputs are the token string and the embedded public keyring.
 *
 * What it does NOT check: revocation (revoked_at lives in portix-cloud; the Runtime learns of a
 * revoked token only when the Portal declines to renew it at heartbeat) and origin allow-listing
 * (a supporting signal applied by the caller, plan §7). Its job is: is this a well-formed,
 * unexpired token that a key we trust actually signed?
 */

/** Parsed public keys are cached by kid — importing a PEM on every verify is wasteful. */
const keyCache = new Map<string, KeyObject>();

function publicKeyFor(kid: string, keyring: RuntimePublicKeyring): KeyObject | undefined {
  const cached = keyCache.get(kid);
  if (cached) {
    return cached;
  }
  const pem = keyring[kid];
  if (!pem) {
    return undefined;
  }
  const key = createPublicKey(pem);
  keyCache.set(kid, key);
  return key;
}

function decodeSegment<T>(segment: string): T | undefined {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf-8')) as T;
  } catch {
    return undefined;
  }
}

/**
 * @param token   the compact JWS license token
 * @param keyring kid → PEM public key (the runtime's embedded keyring)
 * @param options injectable clock + the expected Application ID for binding (see VerifyOptions)
 */
export function verifyLicenseToken(
  token: string,
  keyring: RuntimePublicKeyring,
  options: VerifyOptions = {},
): LicenseVerificationResult {
  const nowMs = options.now ?? Date.now();
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'malformed' };
  }
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = decodeSegment<LicenseTokenHeader>(headerB64);
  const claims = decodeSegment<LicenseTokenClaims>(payloadB64);
  if (!header || !claims || header.alg !== 'ES256' || typeof header.kid !== 'string') {
    return { valid: false, reason: 'malformed' };
  }

  const publicKey = publicKeyFor(header.kid, keyring);
  if (!publicKey) {
    // No trusted key names this token. Surfaced so the caller can log a rotation gap
    // (a runtime older than the key that signed the token it was handed).
    return { valid: false, reason: 'unknown_kid', kid: header.kid };
  }

  let signatureOk = false;
  try {
    const signature = Buffer.from(signatureB64, 'base64url');
    signatureOk = cryptoVerify(
      'sha256',
      Buffer.from(`${headerB64}.${payloadB64}`),
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      signature,
    );
  } catch {
    // A signature that isn't the expected 64-byte P-256 length throws rather than returning false.
    signatureOk = false;
  }
  if (!signatureOk) {
    return { valid: false, reason: 'bad_signature', kid: header.kid };
  }

  // Signature is good. Everything below trusts the claims only because a key we hold signed them —
  // but a valid signature over garbage claims is still garbage, so we validate the claims strictly.

  // Issuer: must be Portix.One's token service, no other.
  if (claims.iss !== 'portix.one') {
    return { valid: false, reason: 'bad_issuer', kid: header.kid, claims };
  }

  // Timestamp coherence: iat/exp must be numbers forming a sane, bounded window. Catches a cloud
  // bug or a near-permanent credential slipping through under a good signature.
  const iatOk = typeof claims.iat === 'number' && Number.isFinite(claims.iat);
  const expOk = typeof claims.exp === 'number' && Number.isFinite(claims.exp);
  if (!iatOk || !expOk || claims.iat > claims.exp) {
    return { valid: false, reason: 'incoherent_claims', kid: header.kid, claims };
  }
  if ((claims.exp - claims.iat) * 1000 > GRACE.MAX_TOKEN_LIFETIME_MS) {
    return { valid: false, reason: 'incoherent_claims', kid: header.kid, claims };
  }

  // Application binding: the token must authorize THIS runtime's Application, and its subject must
  // equal its applicationId. Skipped when the runtime has no registered Application (a dev machine).
  if (claims.sub !== claims.applicationId) {
    return { valid: false, reason: 'application_mismatch', kid: header.kid, claims };
  }
  if (options.expectedApplicationId && claims.applicationId !== options.expectedApplicationId) {
    return { valid: false, reason: 'application_mismatch', kid: header.kid, claims };
  }

  // Expiry last: claims are structurally sound, so an expired token can still feed the grace math.
  if (claims.exp * 1000 <= nowMs) {
    return { valid: false, reason: 'expired', kid: header.kid, claims };
  }

  return { valid: true, claims, kid: header.kid };
}
