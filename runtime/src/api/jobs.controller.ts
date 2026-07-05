import type { ServerResponse } from 'node:http';
import type { JobOwner } from '@portixone/protocol';
import type { QueueService } from '../queue/queue.service.js';

export function handleGetJobs(res: ServerResponse, queueService: QueueService, owner?: JobOwner): void {
  const jobs = queueService.getJobs(owner);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(jobs));
}

export function handleCancelJob(
  res: ServerResponse,
  queueService: QueueService,
  jobId: string,
  owner?: JobOwner,
): void {
  const result = queueService.cancel(jobId, owner);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result));
}
