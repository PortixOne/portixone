import { ClientAdapter } from './client.adapter.js';
import type { PortixClientOptions, PrintOptions } from './types.js';

export function createPortixClient(options: PortixClientOptions) {
  const adapter = new ClientAdapter(options);
  return {
    print: (job: PrintOptions) => adapter.print(job),
    getStatus: () => adapter.getStatus(),
  };
}

export type { PortixClientOptions, PrintOptions, PrintResult, RuntimeStatusResult } from './types.js';
