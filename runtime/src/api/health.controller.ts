import type { ServerResponse } from 'node:http';
import { PROTOCOL_VERSION, type RuntimeStatus } from '@portixone/protocol';
import type { ConfigService } from '../config/config.service.js';

export function handleHealth(res: ServerResponse, configService: ConfigService): void {
  const config = configService.get();
  const body: RuntimeStatus = {
    status: 'online',
    version: PROTOCOL_VERSION,
    defaultPrinter: config.defaultPrinter,
  };
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}
