import { join } from 'node:path';
import type { PairingRecord } from '@portixone/protocol';
import { StorageRepository } from '../storage/storage.repository.js';

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

  findByToken(token: string): PairingRecord | undefined {
    return this.records.find((record) => record.token === token);
  }

  list(): PairingRecord[] {
    return [...this.records];
  }
}
