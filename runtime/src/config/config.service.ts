import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { DEFAULT_RUNTIME_HOST, DEFAULT_RUNTIME_PORT } from '@portixone/shared';
import { StorageRepository } from '../storage/storage.repository.js';
import { runtimeConfigSchema } from './config.schema.js';
import type { RuntimeConfig } from './config.types.js';

export class ConfigService {
  private readonly storage = new StorageRepository<RuntimeConfig>(
    join(process.cwd(), '.data', 'config.json'),
  );
  private config: RuntimeConfig | undefined;

  load(): RuntimeConfig {
    if (this.config) {
      return this.config;
    }

    const stored = this.storage.read();
    const resolved: RuntimeConfig = {
      port: Number(process.env.PORTIX_RUNTIME_PORT) || stored?.port || DEFAULT_RUNTIME_PORT,
      host: process.env.PORTIX_RUNTIME_HOST || stored?.host || DEFAULT_RUNTIME_HOST,
      apiKey: process.env.PORTIX_LOCAL_API_KEY || stored?.apiKey || randomUUID(),
      defaultPrinter: stored?.defaultPrinter,
    };

    runtimeConfigSchema.parse(resolved);
    this.storage.write(resolved);
    this.config = resolved;
    return resolved;
  }

  get(): RuntimeConfig {
    if (!this.config) {
      throw new Error('Config not loaded yet — call load() first');
    }
    return this.config;
  }
}
