import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { PortixError } from '@portixone/shared';
import { AuthService } from '../auth/auth.service.js';
import { assertApiKey } from '../auth/auth.middleware.js';
import { SecurityService } from '../security/security.service.js';
import type { ConfigService } from '../config/config.service.js';
import type { LoggerService } from '../logger/logger.service.js';
import type { QueueManager } from '../queue/queue.manager.js';
import { handleHealth } from './health.controller.js';
import { handlePrint } from './print.controller.js';

interface RouteDeps {
  configService: ConfigService;
  logger: LoggerService;
  queueManager: QueueManager;
}

const STATUS_BY_ERROR_CODE: Record<string, number> = {
  INVALID_API_KEY: 401,
  PRINTER_NOT_FOUND: 404,
  INVALID_PRINT_JOB: 400,
  JOB_NOT_FOUND: 404,
};

export function createApiServer({ configService, logger, queueManager }: RouteDeps): Server {
  const auth = new AuthService();
  const security = new SecurityService();

  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    security.applyCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (req.method === 'GET' && req.url === '/health') {
        handleHealth(res, configService);
        return;
      }

      if (req.method === 'POST' && req.url === '/print') {
        assertApiKey(req, auth, configService.get().apiKey);
        await handlePrint(req, res, queueManager);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'NOT_FOUND',
          message: `No route for ${req.method} ${req.url}`,
        }),
      );
    } catch (error) {
      const err = error as Error & { code?: string };
      const status = error instanceof PortixError ? (STATUS_BY_ERROR_CODE[err.code!] ?? 400) : 500;

      if (status >= 500) {
        logger.error('Request failed', { url: req.url, error: err.message });
      } else {
        logger.warn('Request rejected', { url: req.url, error: err.message });
      }

      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: error instanceof PortixError ? err.code : 'INTERNAL_ERROR',
          message: err.message,
        }),
      );
    }
  });
}
