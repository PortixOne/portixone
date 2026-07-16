import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GRACE, type ApplicationStatus, type LicenseTokenClaims, type RuntimeLicensePosture } from '@portixone/protocol';
import { derivePosture } from './license.service.js';
import { makeClaims } from '../../test-support/sign-license-token.js';

/**
 * The precedence table (hardening #2) — the SHARED source of truth for how signature/token state,
 * commercial state, connectivity, and revocation combine into a runtime posture. `derivePosture`
 * is the one implementation; portix-cloud must not diverge from these rows.
 *
 * How the conceptual axes map onto this runtime's model:
 *   - "commercial state" is carried BY the token (`applicationStatus`): a Portal that is reachable
 *     and honoring commercial grace keeps issuing VALID `grace_period` tokens. So commercial grace
 *     is a valid-token row, not an expired-token row.
 *   - "connectivity" is expressed as token freshness: a fresh (unexpired) token means the Portal
 *     was reachable; an expired token means it wasn't, and offline/technical grace runs from expiry.
 *   - authenticated revocation is a separate, highest-precedence input.
 *
 * INVARIANT across EVERY row: printing / queue / printer-recovery remain available. That is
 * guaranteed structurally (the print plane has no LicenseService dependency — see
 * license.architecture.test.ts), not per-row, so it is asserted there, once, for all rows.
 */

const NOW = 1_800_000_000_000;
const H = 60 * 60 * 1000;

function claims(status: ApplicationStatus, expMs: number): LicenseTokenClaims {
  return makeClaims({ applicationStatus: status, exp: Math.floor(expMs / 1000) });
}

interface Row {
  name: string;
  claims: LicenseTokenClaims | undefined;
  verified: boolean;
  expiresAt: number | undefined;
  hasAppId: boolean;
  revoked: boolean;
  expect: RuntimeLicensePosture;
}

const TABLE: Row[] = [
  {
    name: 'valid token · production_active · reachable → production_active',
    claims: claims('production_active', NOW + 10 * H),
    verified: true,
    expiresAt: NOW + 10 * H,
    hasAppId: true,
    revoked: false,
    expect: 'production_active',
  },
  {
    name: 'valid token · launch_trial · reachable → trial_active',
    claims: claims('launch_trial', NOW + 10 * H),
    verified: true,
    expiresAt: NOW + 10 * H,
    hasAppId: true,
    revoked: false,
    expect: 'trial_active',
  },
  {
    name: 'valid token · commercial grace_period (payment) · reachable → grace_payment',
    claims: claims('grace_period', NOW + 10 * H),
    verified: true,
    expiresAt: NOW + 10 * H,
    hasAppId: true,
    revoked: false,
    expect: 'grace_payment',
  },
  {
    name: 'expired ≤72h · was active · Portal unreachable → grace_portal_unreachable (technical grace)',
    claims: claims('production_active', NOW - 2 * H),
    verified: false,
    expiresAt: NOW - 2 * H,
    hasAppId: true,
    revoked: false,
    expect: 'grace_portal_unreachable',
  },
  {
    name: 'expired at exactly the 72h boundary edge (1h left) → still technical grace',
    claims: claims('production_active', NOW - GRACE.OFFLINE_GRACE_MS + 1 * H),
    verified: false,
    expiresAt: NOW - GRACE.OFFLINE_GRACE_MS + 1 * H,
    hasAppId: true,
    revoked: false,
    expect: 'grace_portal_unreachable',
  },
  {
    name: 'expired >72h · offline grace exhausted → action_required (admin only)',
    claims: claims('production_active', NOW - (GRACE.OFFLINE_GRACE_MS + 5 * H)),
    verified: false,
    expiresAt: NOW - (GRACE.OFFLINE_GRACE_MS + 5 * H),
    hasAppId: true,
    revoked: false,
    expect: 'action_required',
  },
  {
    name: 'authenticated revocation · any token state → action_required (highest precedence)',
    claims: claims('production_active', NOW + 10 * H),
    verified: true,
    expiresAt: NOW + 10 * H,
    hasAppId: true,
    revoked: true,
    expect: 'action_required',
  },
  {
    name: 'unexpired token we cannot verify (unknown kid / bad sig) → unlicensed (conserve nothing unverifiable)',
    claims: claims('production_active', NOW + 10 * H),
    verified: false,
    expiresAt: NOW + 10 * H,
    hasAppId: true,
    revoked: false,
    expect: 'unlicensed',
  },
  {
    name: 'no token · Application configured → unlicensed',
    claims: undefined,
    verified: false,
    expiresAt: undefined,
    hasAppId: true,
    revoked: false,
    expect: 'unlicensed',
  },
  {
    name: 'no token · no Application (dev machine) → development',
    claims: undefined,
    verified: false,
    expiresAt: undefined,
    hasAppId: false,
    revoked: false,
    expect: 'development',
  },
];

for (const row of TABLE) {
  test(`precedence: ${row.name}`, () => {
    const posture = derivePosture(row.claims, row.verified, row.expiresAt, row.hasAppId, row.revoked, NOW);
    assert.equal(posture, row.expect);
  });
}
