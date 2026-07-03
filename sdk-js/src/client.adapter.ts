import { API_KEY_HEADER } from '@portixone/protocol';
import { DEFAULT_RUNTIME_HOST, DEFAULT_RUNTIME_PORT } from '@portixone/shared';
import type { PortixClientOptions, PrintOptions, PrintResult, RuntimeStatusResult } from './types.js';

export class ClientAdapter {
  private readonly baseUrl: string;

  constructor(private readonly options: PortixClientOptions) {
    const host = options.host ?? DEFAULT_RUNTIME_HOST;
    const port = options.port ?? DEFAULT_RUNTIME_PORT;
    this.baseUrl = `http://${host}:${port}`;
  }

  async print(job: PrintOptions): Promise<PrintResult> {
    const response = await fetch(`${this.baseUrl}/print`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [API_KEY_HEADER]: this.options.apiKey,
      },
      body: JSON.stringify(job),
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.message ?? `PortixOne print request failed (${response.status})`);
    }
    return body as PrintResult;
  }

  async getStatus(): Promise<RuntimeStatusResult> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`PortixOne runtime unreachable (${response.status})`);
    }
    return (await response.json()) as RuntimeStatusResult;
  }
}
