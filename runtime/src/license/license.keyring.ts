import type { RuntimePublicKeyring } from '@portixone/protocol';
import { PRODUCTION_KEYRING } from './license.keyring.prod.js';
import { DEVELOPMENT_KEYRING, DEVELOPMENT_KIDS } from './license.keyring.dev.js';

/**
 * Fail-closed keyring resolution (hardening #1).
 *
 * The dangerous mistake is *forgetting* to exclude the development key from a commercial build.
 * So the default is the SAFE one: unless the runtime is explicitly told it is a development
 * environment, it resolves to `production` and never merges in the development keyring. A boot in
 * production additionally ABORTS if a development `kid` is somehow present in its keyring — a
 * build defect that must be caught before shipping, never in a customer's hands.
 *
 * Reasoning about the fail-closed default: a production runtime with an empty keyring simply
 * cannot verify any token, so it prints unlicensed — safe. A production runtime that *accepted*
 * the dev key would be a licensing bypass — unsafe. Between those two failure modes we choose the
 * safe one by default.
 */

export type LicenseEnv = 'production' | 'development';

/**
 * Resolve the license environment. Fail-closed: PRODUCTION unless something explicitly opts into
 * development (`PORTIX_LICENSE_ENV=development`, or `NODE_ENV=development`). Never infers
 * development from the absence of configuration.
 */
export function resolveLicenseEnv(env: NodeJS.ProcessEnv = process.env): LicenseEnv {
  if (env.PORTIX_LICENSE_ENV === 'development') {
    return 'development';
  }
  if (env.PORTIX_LICENSE_ENV === 'production') {
    return 'production';
  }
  return env.NODE_ENV === 'development' ? 'development' : 'production';
}

/**
 * The active keyring for the given environment. Production trusts ONLY the production keyring;
 * development additionally merges the development keyring. The dev keyring is never merged into a
 * production keyring here — the exclusion is structural, not a runtime toggle over one shared map.
 */
export function resolveKeyring(licenseEnv: LicenseEnv): RuntimePublicKeyring {
  if (licenseEnv === 'development') {
    return { ...PRODUCTION_KEYRING, ...DEVELOPMENT_KEYRING };
  }
  return { ...PRODUCTION_KEYRING };
}

/**
 * Boot guard: abort if a production runtime holds any development `kid`. This only fires on a
 * mis-built artifact (a dev key hardcoded into the production keyring); a correctly built
 * production runtime passes trivially. Throwing here is intentional fail-closed on a build defect
 * — it does NOT gate printing at runtime (it runs once at boot, and only a broken build trips it).
 */
export function assertNoDevKeysInProduction(keyring: RuntimePublicKeyring, licenseEnv: LicenseEnv): void {
  if (licenseEnv !== 'production') {
    return;
  }
  const offending = Object.keys(keyring).filter((kid) => DEVELOPMENT_KIDS.includes(kid));
  if (offending.length > 0) {
    throw new Error(
      `FATAL: development signing key(s) [${offending.join(', ')}] present in a PRODUCTION keyring — ` +
        'refusing to start. A commercial build must never treat a development key as authority.',
    );
  }
}

export { DEVELOPMENT_KEYRING, DEVELOPMENT_KIDS, PRODUCTION_KEYRING };
