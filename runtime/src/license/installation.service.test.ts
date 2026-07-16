import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, test } from 'node:test';
import { distributionBranding } from '@portixone/shared';
import { InstallationService } from './installation.service.js';
import { LicenseService } from './license.service.js';
import { DEVELOPMENT_KEYRING } from './license.keyring.js';
import { makeClaims, signLicenseToken } from '../../test-support/sign-license-token.js';

const silentLogger = {
  info() {},
  warn() {},
  error() {},
} as unknown as ConstructorParameters<typeof LicenseService>[0];

const INSTALLATION_FILE = join(process.cwd(), '.data', 'installation.json');

/** Each test starts with no persisted Installation Identity — the store path is cwd-fixed. */
beforeEach(() => {
  rmSync(INSTALLATION_FILE, { force: true });
  for (const f of ['license.json', 'clock.json']) {
    rmSync(join(process.cwd(), '.data', f), { force: true });
  }
});

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

function newLicense(): LicenseService {
  return new LicenseService(silentLogger, { keyring: DEVELOPMENT_KEYRING, now: () => Date.now() });
}

test('distributionBranding keeps Portix visibly present without full white-label', () => {
  assert.equal(distributionBranding('Nerion POS'), 'Printing Runtime for Nerion POS — Powered by Portix.One');
  assert.equal(distributionBranding('  '), 'Printing Runtime — Powered by Portix.One');
});

test('inert for a plain dev runtime (no token / no registration URL)', async () => {
  let called = false;
  const service = new InstallationService(silentLogger, newLicense(), {
    fetchImpl: async () => {
      called = true;
      return okResponse({});
    },
  });
  assert.equal(await service.registerIfNeeded(), undefined);
  assert.equal(called, false);
  assert.equal(service.branding(), undefined);
});

test('exchanges a one-time token for an Installation Identity and applies the first license token', async () => {
  const license = newLicense();
  const firstToken = signLicenseToken(makeClaims({ applicationStatus: 'production_active' }));
  const service = new InstallationService(silentLogger, license, {
    installationToken: 'inst_once_abc',
    registrationUrl: 'https://portal.example.com/installations',
    fetchImpl: async () =>
      okResponse({
        installationId: 'inst_1',
        applicationId: 'app_demo_abc123',
        appName: 'Nerion POS',
        token: firstToken,
      }),
  });
  const identity = await service.registerIfNeeded();
  assert.equal(identity?.installationId, 'inst_1');
  assert.equal(service.branding(), 'Printing Runtime for Nerion POS — Powered by Portix.One');
  // The first license token handed back at registration is applied immediately.
  assert.equal(license.getState().posture, 'production_active');
});

test('is idempotent — a second call never burns another token', async () => {
  let calls = 0;
  const service = new InstallationService(silentLogger, newLicense(), {
    installationToken: 'inst_once_abc',
    registrationUrl: 'https://portal.example.com/installations',
    fetchImpl: async () => {
      calls += 1;
      return okResponse({ installationId: 'inst_1', applicationId: 'app_demo_abc123' });
    },
  });
  await service.registerIfNeeded();
  await service.registerIfNeeded();
  assert.equal(calls, 1);
});

test('a failed exchange is swallowed and leaves no identity (retried next boot)', async () => {
  const service = new InstallationService(silentLogger, newLicense(), {
    installationToken: 'inst_once_abc',
    registrationUrl: 'https://portal.example.com/installations',
    fetchImpl: async () => {
      throw new Error('ETIMEDOUT');
    },
  });
  assert.equal(await service.registerIfNeeded(), undefined);
  assert.equal(service.getIdentity(), undefined);
});
