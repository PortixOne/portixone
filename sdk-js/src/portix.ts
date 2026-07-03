import { ClientAdapter } from './client.adapter.js';
import type { PortixOptions, PrintOptions, PrintResult, RuntimeStatusResult } from './types.js';

const DEFAULT_LOCAL_API_KEY = 'dev-local-key';

/**
 * The PortixOne SDK entry point.
 *
 * ```ts
 * const portix = new Portix();
 * await portix.connect();
 * await portix.print({ content: "Hello PortixOne!" });
 * ```
 */
export class Portix {
  private adapter?: ClientAdapter;

  constructor(private readonly options: PortixOptions = {}) {}

  async connect(): Promise<void> {
    const adapter = new ClientAdapter({
      apiKey: this.options.apiKey ?? DEFAULT_LOCAL_API_KEY,
      host: this.options.host,
      port: this.options.port,
    });
    await adapter.getStatus();
    this.adapter = adapter;
  }

  async print(job: PrintOptions): Promise<PrintResult> {
    return this.requireAdapter().print(job);
  }

  async getStatus(): Promise<RuntimeStatusResult> {
    return this.requireAdapter().getStatus();
  }

  private requireAdapter(): ClientAdapter {
    if (!this.adapter) {
      throw new Error('Call portix.connect() before using the client — no active connection to the PortixOne runtime.');
    }
    return this.adapter;
  }
}
