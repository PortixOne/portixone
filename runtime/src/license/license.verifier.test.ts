import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyLicenseToken } from './license.verifier.js';
import { DEVELOPMENT_KEYRING } from './license.keyring.js';
import { makeClaims, signLicenseToken } from '../../test-support/sign-license-token.js';

const KEYRING = DEVELOPMENT_KEYRING;
const HOUR = 60 * 60 * 1000;

test('accepts a valid token signed by a known key', () => {
  const token = signLicenseToken(makeClaims());
  const result = verifyLicenseToken(token, KEYRING);
  assert.equal(result.valid, true);
  assert.equal(result.kid, 'key_dev_2026_01');
  assert.equal(result.claims?.applicationId, 'app_demo_abc123');
});

test('rejects an expired token but still returns its claims', () => {
  const iat = Math.floor(Date.now() / 1000) - (100 * HOUR) / 1000;
  const token = signLicenseToken(makeClaims({ iat, exp: iat + 48 * 60 * 60 }));
  const result = verifyLicenseToken(token, KEYRING);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'expired');
  // Claims are surfaced on expiry so the service can still run the grace math off them.
  assert.equal(result.claims?.applicationId, 'app_demo_abc123');
});

test('rejects a token whose signature was tampered with', () => {
  const token = signLicenseToken(makeClaims());
  const tampered = `${token.slice(0, -6)}AAAAAA`;
  const result = verifyLicenseToken(tampered, KEYRING);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'bad_signature');
});

test('rejects a token signed by a key not in the keyring (rotation gap)', () => {
  const token = signLicenseToken(makeClaims(), { kid: 'key_from_the_future_2027' });
  const result = verifyLicenseToken(token, KEYRING);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'unknown_kid');
  assert.equal(result.kid, 'key_from_the_future_2027');
});

test('rejects a structurally malformed token', () => {
  assert.equal(verifyLicenseToken('not.a.jwt', KEYRING).reason, 'malformed');
  assert.equal(verifyLicenseToken('only-one-segment', KEYRING).reason, 'malformed');
  assert.equal(verifyLicenseToken('a.b', KEYRING).reason, 'malformed');
});

test('rejects a token with a non-ES256 alg header', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: 'key_dev_2026_01' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(makeClaims())).toString('base64url');
  const result = verifyLicenseToken(`${header}.${payload}.signature`, KEYRING);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'malformed');
});

test('expiry is enforced with an injected clock', () => {
  const claims = makeClaims();
  const beforeExpiry = claims.exp * 1000 - 1_000;
  const afterExpiry = claims.exp * 1000 + 1_000;
  const token = signLicenseToken(claims);
  assert.equal(verifyLicenseToken(token, KEYRING, { now: beforeExpiry }).valid, true);
  assert.equal(verifyLicenseToken(token, KEYRING, { now: afterExpiry }).reason, 'expired');
});

// ── Strict claims validation (hardening #4) ─────────────────────────────────────────────────

test('rejects a token whose issuer is not portix.one', () => {
  const token = signLicenseToken(makeClaims({ iss: 'evil.example.com' as 'portix.one' }));
  assert.equal(verifyLicenseToken(token, KEYRING).reason, 'bad_issuer');
});

test('rejects a token whose sub does not equal its applicationId', () => {
  const token = signLicenseToken(makeClaims({ sub: 'app_other_zzz999' }));
  assert.equal(verifyLicenseToken(token, KEYRING).reason, 'application_mismatch');
});

test('rejects a valid token for a different Application than this runtime expects', () => {
  const token = signLicenseToken(makeClaims()); // applicationId app_demo_abc123
  const result = verifyLicenseToken(token, KEYRING, { expectedApplicationId: 'app_someone_else' });
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'application_mismatch');
});

test('accepts when the expected Application matches', () => {
  const token = signLicenseToken(makeClaims());
  assert.equal(verifyLicenseToken(token, KEYRING, { expectedApplicationId: 'app_demo_abc123' }).valid, true);
});

test('rejects incoherent timestamps (iat after exp)', () => {
  const iat = Math.floor(Date.now() / 1000) + 10 * 60 * 60;
  const token = signLicenseToken(makeClaims({ iat, exp: iat - 60 })); // exp before iat
  assert.equal(verifyLicenseToken(token, KEYRING).reason, 'incoherent_claims');
});

test('rejects a token whose lifetime exceeds the sanity clamp (near-permanent credential)', () => {
  const iat = Math.floor(Date.now() / 1000);
  const token = signLicenseToken(makeClaims({ iat, exp: iat + 400 * 24 * 60 * 60 })); // ~400 days
  assert.equal(verifyLicenseToken(token, KEYRING).reason, 'incoherent_claims');
});
