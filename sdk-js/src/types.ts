import { WS_EVENTS } from '@portixone/protocol';

export type { PrintJob as PrintOptions } from '@portixone/protocol';
export type {
  PrintJobResult as PrintResult,
  RuntimeStatus as RuntimeStatusResult,
  PrinterInfo,
  JobRecord,
  JobOwner,
  PairingRequestResult,
  PairingStatusResult,
  RuntimeMetrics,
} from '@portixone/protocol';

export interface PortixClientOptions {
  apiKey: string;
  host?: string;
  port?: number;
}

export interface PortixOptions {
  /** Defaults to the local-dev convention (`runtime/.env.example`'s `PORTIX_LOCAL_API_KEY`). */
  apiKey?: string;
  host?: string;
  port?: number;
  /**
   * `"runtime"` (default) talks to a real Portix Runtime. `"mock"` needs no
   * runtime and no printer at all — `print()` renders a text preview of the
   * receipt instead, so a stranger can try the SDK in one command.
   */
  mode?: 'runtime' | 'mock';
  /** This integration's identity with the runtime. Required to call `pair()`. */
  appId?: string;
  /** The specific business/customer this connection is on behalf of. Required to call `pair()`. */
  tenant?: string;
}

/** The real-time events the runtime pushes over WebSocket, plus the SDK-local `paired` event. */
export type RuntimeEvent = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];
export type PortixEvent = RuntimeEvent | 'paired';
export type PortixEventHandler = (data: unknown) => void;
