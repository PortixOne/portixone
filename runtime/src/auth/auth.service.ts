import type { Permission } from '@portixone/protocol';
import { InvalidApiKeyError } from '@portixone/shared';
import type { PairingService } from '../pairing/pairing.service.js';

/**
 * The caller identity behind a request: either the runtime admin (the static
 * key configured on this machine) or a specific paired app, scoped to its
 * own tenant/permissions.
 */
export interface AuthContext {
  isAdmin: boolean;
  tenant?: string;
  appId?: string;
  deviceId?: string;
  permissions?: Permission[];
  /** The origin this pairing was created from, if any — see auth.middleware.ts's trusted-origin check. */
  origin?: string;
}

export class AuthService {
  constructor(private readonly pairingService: PairingService) {}

  authenticate(providedKey: string | undefined, adminKey: string): AuthContext {
    if (typeof providedKey !== 'string' || providedKey.length === 0) {
      throw new InvalidApiKeyError();
    }
    if (providedKey === adminKey) {
      return { isAdmin: true };
    }

    const pairing = this.pairingService.findByToken(providedKey);
    if (!pairing) {
      throw new InvalidApiKeyError();
    }
    this.pairingService.touch(pairing.deviceId);

    return {
      isAdmin: false,
      tenant: pairing.tenant,
      appId: pairing.appId,
      deviceId: pairing.deviceId,
      permissions: pairing.permissions,
      origin: pairing.origin,
    };
  }
}
