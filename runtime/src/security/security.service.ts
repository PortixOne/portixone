import type { ServerResponse } from 'node:http';
import { API_KEY_HEADER } from '@portixone/protocol';

/**
 * Local web apps run on arbitrary origins (any dev/prod domain), so the
 * runtime must allow cross-origin requests by design — the actual gate is
 * the API key, not CORS. This service only sets the headers that make that
 * possible from a browser.
 */
export class SecurityService {
  applyCorsHeaders(res: ServerResponse): void {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', `Content-Type, ${API_KEY_HEADER}`);
  }
}
