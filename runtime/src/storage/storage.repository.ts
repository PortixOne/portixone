import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export class StorageRepository<T> {
  constructor(private readonly filePath: string) {}

  read(): T | undefined {
    if (!existsSync(this.filePath)) {
      return undefined;
    }
    const raw = readFileSync(this.filePath, 'utf-8');
    return JSON.parse(raw) as T;
  }

  write(data: T): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
