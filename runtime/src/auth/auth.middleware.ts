import type { IncomingMessage } from 'node:http';
import { API_KEY_HEADER, type Permission } from '@portixone/protocol';
import { PermissionDeniedError, UntrustedOriginError } from '@portixone/shared';
import type { AuthContext, AuthService } from './auth.service.js';

export function assertAuthenticated(req: IncomingMessage, authService: AuthService, adminKey: string): AuthContext {
  const providedKey = req.headers[API_KEY_HEADER] as string | undefined;
  const context = authService.authenticate(providedKey, adminKey);

  // Browsers always send Origin on cross-origin fetches; a mismatch here means
  // a different site than the one this app paired from is using its token.
  const requestOrigin = req.headers.origin;
  if (!context.isAdmin && context.origin && requestOrigin && requestOrigin !== context.origin) {
    throw new UntrustedOriginError();
  }

  return context;
}

export function assertPermission(context: AuthContext, permission: Permission): void {
  if (context.isAdmin) {
    return;
  }
  if (!context.permissions?.includes(permission)) {
    throw new PermissionDeniedError(permission);
  }
}

export function assertAdmin(context: AuthContext): void {
  if (!context.isAdmin) {
    throw new PermissionDeniedError('admin');
  }
}
