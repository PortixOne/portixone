import type { RuntimePublicKeyring } from '@portixone/protocol';

/**
 * The DEVELOPMENT public keyring. Merged into the active keyring ONLY when the runtime resolves to
 * the `development` license environment (see license.keyring.ts). A production build must never
 * accept these as authority — that would be a signing bypass, because the matching PRIVATE key is
 * a well-known development fixture in `runtime/test-support/` (discoverable, by design).
 *
 * The public key itself living in Git is fine; the danger is a COMMERCIAL build treating it as an
 * authority. That is prevented three ways: (1) `resolveKeyring('production')` never merges this in,
 * (2) `assertNoDevKeysInProduction` aborts boot if a dev `kid` is ever present in a production
 * keyring, (3) a test asserts `DEVELOPMENT_KIDS` never appear in `license.keyring.prod.ts`.
 */
export const DEVELOPMENT_KEYRING: RuntimePublicKeyring = {
  key_dev_2026_01: [
    '-----BEGIN PUBLIC KEY-----',
    'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEo7O9H6zH+gmciwp19snET4DkQE0X',
    'dO+/jjx+R77LxyVnfUf2w/VLoaYhxrPXHaSX8jV3aeQO/9VI5znOR5z9uQ==',
    '-----END PUBLIC KEY-----',
  ].join('\n'),
};

/** The set of `kid`s that are development-only and must never be authoritative in production. */
export const DEVELOPMENT_KIDS: readonly string[] = Object.keys(DEVELOPMENT_KEYRING);
