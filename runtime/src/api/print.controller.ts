import type { IncomingMessage, ServerResponse } from 'node:http';
import type { JobOwner } from '@portixone/protocol';
import { readJsonBody } from '../protocol/protocol.adapter.js';
import { validatePrintJob } from '../protocol/protocol.validator.js';
import type { QueueService } from '../queue/queue.service.js';

export async function handlePrint(
  req: IncomingMessage,
  res: ServerResponse,
  queueService: QueueService,
  owner?: JobOwner,
): Promise<void> {
  const payload = await readJsonBody<unknown>(req);
  const job = validatePrintJob(payload);
  const result = queueService.enqueue(job, owner);
  res.writeHead(202, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
}
