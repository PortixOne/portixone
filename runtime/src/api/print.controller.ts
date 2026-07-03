import type { IncomingMessage, ServerResponse } from 'node:http';
import { readJsonBody } from '../protocol/protocol.adapter.js';
import { validatePrintJob } from '../protocol/protocol.validator.js';
import type { QueueManager } from '../queue/queue.manager.js';

export async function handlePrint(
  req: IncomingMessage,
  res: ServerResponse,
  queueManager: QueueManager,
): Promise<void> {
  const payload = await readJsonBody<unknown>(req);
  const job = validatePrintJob(payload);
  const result = queueManager.enqueue(job);
  res.writeHead(202, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
}
