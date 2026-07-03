import type { IncomingMessage } from 'node:http';
import { API_KEY_HEADER } from '@portixone/protocol';
import { InvalidApiKeyError } from '@portixone/shared';
import type { AuthService } from './auth.service.js';

export function assertApiKey(req: IncomingMessage, authService: AuthService, expectedKey: string): void {
  const providedKey = req.headers[API_KEY_HEADER] as string | undefined;
  if (!authService.validate(providedKey, expectedKey)) {
    throw new InvalidApiKeyError();
  }
}
