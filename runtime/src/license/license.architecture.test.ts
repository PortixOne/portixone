import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { assertNoDevKeysInProduction, resolveKeyring, resolveLicenseEnv } from './license.keyring.js';
import { DEVELOPMENT_KIDS } from './license.keyring.dev.js';
import { PRODUCTION_KEYRING } from './license.keyring.prod.js';

const runtimeSrc = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── Hardening #7: printing and licensing are separate layers ─────────────────────────────────
// The strongest guarantee that a license posture can never gate a print is that the print plane
// doesn't even KNOW about LicenseService — it isn't a constructor dependency, isn't imported.
// This is more robust than grepping for the absence of a method call: you cannot accidentally
// gate on something you never imported.

const PRINT_PLANE_FILES = [
  'api/print.controller.ts',
  'queue/queue.service.ts',
  'queue/queue.worker.ts',
  'queue/queue.store.ts',
  'printer/printer.manager.ts',
];

for (const rel of PRINT_PLANE_FILES) {
  test(`print plane does not depend on the license layer: ${rel}`, () => {
    const source = readFileSync(join(runtimeSrc, rel), 'utf-8');
    assert.ok(
      !/from ['"].*\/license\//.test(source) && !/LicenseService/.test(source),
      `${rel} must not import the license layer — printing must never be able to gate on licensing`,
    );
  });
}

// ── Hardening #1: production keyring is fail-closed and free of development keys ──────────────

test('the production keyring contains no development kid', () => {
  const prodKids = Object.keys(PRODUCTION_KEYRING);
  for (const devKid of DEVELOPMENT_KIDS) {
    assert.ok(!prodKids.includes(devKid), `production keyring must not contain dev kid ${devKid}`);
  }
});

test('the production keyring SOURCE file does not mention the dev kid (artifact inspection)', () => {
  const prodSource = readFileSync(join(runtimeSrc, 'license/license.keyring.prod.ts'), 'utf-8');
  for (const devKid of DEVELOPMENT_KIDS) {
    // The dev kid may appear in comments explaining the rule, but never as an actual key entry.
    const asKeyEntry = new RegExp(`^\\s*${devKid}\\s*:`, 'm');
    assert.ok(!asKeyEntry.test(prodSource), `${devKid} must not be a key entry in the production keyring`);
  }
});

test('resolveKeyring(production) excludes the development keyring', () => {
  const prod = resolveKeyring('production');
  for (const devKid of DEVELOPMENT_KIDS) {
    assert.equal(prod[devKid], undefined);
  }
});

test('resolveKeyring(development) includes the development keyring', () => {
  const dev = resolveKeyring('development');
  assert.ok(DEVELOPMENT_KIDS.every((kid) => typeof dev[kid] === 'string'));
});

test('assertNoDevKeysInProduction aborts if a dev key is present in a production keyring', () => {
  const poisoned = { key_dev_2026_01: '-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----' };
  assert.throws(() => assertNoDevKeysInProduction(poisoned, 'production'), /FATAL/);
  // In development the same keyring is allowed.
  assert.doesNotThrow(() => assertNoDevKeysInProduction(poisoned, 'development'));
});

test('resolveLicenseEnv is fail-closed: anything but an explicit development opt-in is production', () => {
  assert.equal(resolveLicenseEnv({}), 'production');
  assert.equal(resolveLicenseEnv({ NODE_ENV: 'production' }), 'production');
  assert.equal(resolveLicenseEnv({ PORTIX_LICENSE_ENV: 'development' }), 'development');
  assert.equal(resolveLicenseEnv({ NODE_ENV: 'development' }), 'development');
  assert.equal(resolveLicenseEnv({ PORTIX_LICENSE_ENV: 'production', NODE_ENV: 'development' }), 'production');
});
