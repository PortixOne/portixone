import type { RuntimePublicKeyring } from '@portixone/protocol';

/**
 * The PRODUCTION public keyring — the ONLY authority a production build trusts.
 *
 * Empty until portix-cloud generates the production ES256 keypair, guards the private half in its
 * secret store, and hands the public half here under a production `kid` (e.g. `key_2026_01`). See
 * docs/licensing/cloud-implementation.md §9.
 *
 * An empty production keyring is deliberately safe: no token verifies, so every runtime resolves
 * to `unlicensed`/`development` posture — which still prints (licensing never gates printing).
 * A production build must NEVER contain a development key here; `assertNoDevKeysInProduction`
 * (license.keyring.ts) enforces that at boot, and a test asserts the dev `kid` never appears in
 * this file.
 */
export const PRODUCTION_KEYRING: RuntimePublicKeyring = {
  // key_2026_01: '-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----',  ← cloud handoff
};
