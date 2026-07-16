import { createPrivateKey, sign as cryptoSign } from 'node:crypto';
import type { LicenseTokenClaims } from '@portixone/protocol';

/**
 * TEST-ONLY license-token signer. Lives OUTSIDE `src/` so it is never part of the runtime build
 * (tsconfig `include` is `src` only) — this private key must never ship in a client. It exists so
 * the verifier and service tests can mint real ES256 tokens that the embedded DEV public key
 * (`key_dev_2026_01` in src/license/license.keyring.ts) actually verifies, end-to-end, with no
 * network and no external JWT dependency.
 *
 * This is the DEVELOPMENT private key. portix-cloud generates and guards the PRODUCTION private
 * key separately; it is never present in this repo.
 */
const DEV_PRIVATE_KEY_PEM = [
  '-----BEGIN PRIVATE KEY-----',
  'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgaPaAXkHq5W/ZXfd4',
  'y/IbmFN7CH4Fo5JOKp8iKLwYIumhRANCAASjs70frMf6CZyLCnX2ycRPgORATRd0',
  '77+OPH5HvsvHJWd9R/bD9UuhpiHGs9cdpJfyNXdp5A7/1UjnOc5HnP25',
  '-----END PRIVATE KEY-----',
].join('\n');

export const DEV_KID = 'key_dev_2026_01';

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * Signs a compact ES256 JWS the same way portix-cloud will (JOSE raw R‖S signature via
 * `dsaEncoding: 'ieee-p1363'`). Pass a `kid` other than DEV_KID to simulate a rotation gap.
 */
export function signLicenseToken(
  claims: LicenseTokenClaims,
  options: { kid?: string; privateKeyPem?: string } = {},
): string {
  const header = { alg: 'ES256', typ: 'JWT', kid: options.kid ?? DEV_KID };
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(claims));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = createPrivateKey(options.privateKeyPem ?? DEV_PRIVATE_KEY_PEM);
  const signature = cryptoSign('sha256', Buffer.from(signingInput), {
    key,
    dsaEncoding: 'ieee-p1363',
  });
  return `${signingInput}.${signature.toString('base64url')}`;
}

/** A complete, valid-by-default claims object; override fields per test. */
export function makeClaims(overrides: Partial<LicenseTokenClaims> = {}): LicenseTokenClaims {
  const iat = Math.floor(Date.now() / 1000);
  return {
    iss: 'portix.one',
    sub: 'app_demo_abc123',
    iat,
    exp: iat + 48 * 60 * 60,
    developerId: 'dev_1',
    applicationId: 'app_demo_abc123',
    licenseType: 'creator',
    applicationStatus: 'production_active',
    allowedOrigins: ['https://app.example.com'],
    licenseId: 'lic_1',
    activationId: 'act_1',
    tokenVersion: 1,
    ...overrides,
  };
}
