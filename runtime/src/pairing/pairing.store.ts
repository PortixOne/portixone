import { join } from 'node:path';
import type { PairingRecord } from '@portixone/protocol';
import { StorageRepository } from '../storage/storage.repository.js';

/** Only re-persist `lastUsedAt` this often — every authenticated request touching disk would fight the queue for I/O for no real benefit. */
const LAST_USED_WRITE_THROTTLE_MS = 60 * 1000;

/** Approved pairings only — persisted so a paired app is never asked to re-authorize. */
export class PairingStore {
  private readonly storage = new StorageRepository<PairingRecord[]>(
    join(process.cwd(), '.data', 'pairings.json'),
  );
  private records: PairingRecord[];

  constructor() {
    this.records = this.storage.read() ?? [];
  }

  add(record: PairingRecord): void {
    this.records.push(record);
    this.storage.write(this.records);
  }

  /** Immediate effect: `findByToken` for this device stops matching from this call on. */
  remove(deviceId: string): boolean {
    const index = this.records.findIndex((record) => record.deviceId === deviceId);
    if (index < 0) {
      return false;
    }
    this.records.splice(index, 1);
    this.storage.write(this.records);
    return true;
  }

  /** Updates in memory on every call; only hits disk once per LAST_USED_WRITE_THROTTLE_MS per device. */
  touchLastUsed(deviceId: string): void {
    const record = this.records.find((r) => r.deviceId === deviceId);
    if (!record) {
      return;
    }
    const previouslyPersisted = record.lastUsedAt ? new Date(record.lastUsedAt).getTime() : 0;
    const now = Date.now();
    record.lastUsedAt = new Date(now).toISOString();
    if (now - previouslyPersisted > LAST_USED_WRITE_THROTTLE_MS) {
      this.storage.write(this.records);
    }
  }

  findByToken(token: string): PairingRecord | undefined {
    return this.records.find((record) => record.token === token);
  }

  list(): PairingRecord[] {
    return [...this.records];
  }
}
