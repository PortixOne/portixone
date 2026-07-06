import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PairedAppSummary, PairingRecord } from '@portixone/protocol';
import { PairingNotFoundError } from '@portixone/shared';
import { readJsonBody } from '../protocol/protocol.adapter.js';
import { validatePairingApprove, validatePairingRequest } from '../protocol/protocol.validator.js';
import type { PairingService } from '../pairing/pairing.service.js';
import type { QueueService } from '../queue/queue.service.js';

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

export async function handlePairingRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pairingService: PairingService,
): Promise<void> {
  const payload = await readJsonBody<unknown>(req);
  const input = validatePairingRequest(payload);
  const result = pairingService.request(input.tenant, input.appId, req.headers.origin);
  writeJson(res, 202, result);
}

export async function handlePairingApprove(
  req: IncomingMessage,
  res: ServerResponse,
  pairingService: PairingService,
): Promise<void> {
  const payload = await readJsonBody<unknown>(req);
  const input = validatePairingApprove(payload);
  const record = pairingService.approve(input.code);
  writeJson(res, 200, toSummary(record, 0));
}

export function handlePairingStatus(res: ServerResponse, pairingService: PairingService, code: string | null): void {
  if (!code) {
    throw new PairingNotFoundError();
  }
  writeJson(res, 200, pairingService.status(code));
}

export function handleListPairings(res: ServerResponse, pairingService: PairingService, queueService: QueueService): void {
  const paired: PairedAppSummary[] = pairingService
    .listPaired()
    .map((record) => toSummary(record, queueService.getJobs({ tenant: record.tenant, appId: record.appId }).length));
  writeJson(res, 200, paired);
}

export function handleListPendingPairings(res: ServerResponse, pairingService: PairingService): void {
  writeJson(res, 200, pairingService.listPending());
}

/** Revokes a paired app — see ROADMAP.md's Fase 5 "permissions, not pairing" rework. */
export function handlePairingRevoke(res: ServerResponse, pairingService: PairingService, deviceId: string): void {
  if (!pairingService.revoke(deviceId)) {
    throw new PairingNotFoundError();
  }
  writeJson(res, 200, { revoked: true });
}

function toSummary(record: PairingRecord, recentJobCount: number): PairedAppSummary {
  return {
    tenant: record.tenant,
    appId: record.appId,
    deviceId: record.deviceId,
    origin: record.origin,
    permissions: record.permissions,
    pairedAt: record.pairedAt,
    pairingDurationMs: record.pairingDurationMs,
    lastUsedAt: record.lastUsedAt,
    recentJobCount,
  };
}
