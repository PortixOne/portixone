import type { Server } from 'node:http';
import { ConfigService } from '../config/config.service.js';
import { LoggerService } from '../logger/logger.service.js';
import { PrinterManager } from '../printer/printer.manager.js';
import { QueueManager } from '../queue/queue.manager.js';
import { createApiServer } from '../api/api.route.js';
import { WebSocketManager } from '../api/websocket.manager.js';
import { registerShutdown } from './shutdown.service.js';

export interface RuntimeContext {
  server: Server;
  wsManager: WebSocketManager;
  logger: LoggerService;
}

export async function bootstrap(): Promise<RuntimeContext> {
  const configService = new ConfigService();
  const config = configService.load();

  const logger = new LoggerService();
  logger.info('Starting PortixOne Runtime', {
    host: config.host,
    port: config.port,
    printerDriver: config.printerDriver,
  });

  const printerManager = new PrinterManager(config, logger);
  const queueManager = new QueueManager(printerManager, logger);

  const server = createApiServer({ configService, logger, queueManager });
  const wsManager = new WebSocketManager(server);
  queueManager.attachWebSocketManager(wsManager);

  await new Promise<void>((resolve) => {
    server.listen(config.port, config.host, resolve);
  });

  logger.info(`Runtime online at http://${config.host}:${config.port}`);

  const context: RuntimeContext = { server, wsManager, logger };
  registerShutdown(context);
  return context;
}
