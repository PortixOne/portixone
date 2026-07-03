export type { PrintJob as PrintOptions } from '@portixone/protocol';
export type { PrintJobResult as PrintResult, RuntimeStatus as RuntimeStatusResult } from '@portixone/protocol';

export interface PortixClientOptions {
  apiKey: string;
  host?: string;
  port?: number;
}
