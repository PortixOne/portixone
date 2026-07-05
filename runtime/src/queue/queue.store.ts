import { join } from 'node:path';
import type { JobRecord, PrintJobInput } from '@portixone/protocol';
import { StorageRepository } from '../storage/storage.repository.js';

/** Bounds queue.json growth — whichever limit is hit first wins. */
const MAX_HISTORY_JOBS = 1000;
const MAX_HISTORY_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * A job's persisted record plus the original print payload — the payload is
 * what makes resuming a `pending` job after a restart possible (see
 * queue.service.ts's `recover()`); it's kept out of the public `JobRecord`
 * shape returned by the API so getJobs() responses don't balloon with full
 * receipt content for a history of up to 1000 jobs.
 */
export interface StoredJob {
  record: JobRecord;
  job: PrintJobInput;
}

/**
 * Persists the job queue/history to `.data/queue.json` — every state
 * transition is written immediately (synchronously), not batched or flushed
 * on shutdown, so a crash or restart never silently loses queue state.
 */
export class QueueStore {
  private readonly storage = new StorageRepository<StoredJob[]>(join(process.cwd(), '.data', 'queue.json'));
  private entries: StoredJob[];

  constructor() {
    this.entries = this.storage.read() ?? [];
  }

  list(): StoredJob[] {
    return [...this.entries];
  }

  find(jobId: string): StoredJob | undefined {
    return this.entries.find((entry) => entry.record.jobId === jobId);
  }

  upsert(entry: StoredJob): void {
    const index = this.entries.findIndex((existing) => existing.record.jobId === entry.record.jobId);
    if (index >= 0) {
      this.entries[index] = entry;
    } else {
      this.entries.push(entry);
    }
    this.prune();
    this.storage.write(this.entries);
  }

  /** Keeps at most the most recent MAX_HISTORY_JOBS entries, and drops anything older than MAX_HISTORY_AGE_MS. */
  private prune(): void {
    const cutoff = Date.now() - MAX_HISTORY_AGE_MS;
    this.entries = this.entries
      .filter((entry) => new Date(entry.record.createdAt).getTime() >= cutoff)
      .sort((a, b) => b.record.createdAt.localeCompare(a.record.createdAt))
      .slice(0, MAX_HISTORY_JOBS);
  }
}
