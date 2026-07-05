import { DEFAULT_RUNTIME_HOST, DEFAULT_RUNTIME_PORT } from '@portixone/shared';
import type { PortixEventBus } from './event-bus.js';
import type { PortixEvent } from './types.js';

interface WireMessage {
  event: PortixEvent;
  data: unknown;
}

/**
 * Relays the runtime's WebSocket push channel into the SDK's event bus.
 * `WebSocket` is a browser global and, in Node, only global since v22 — on
 * older Node (the SDK's supported floor is v20) this degrades to no live
 * updates rather than crashing; poll `getJobs()` there instead.
 */
export class RuntimeSocket {
  private readonly socket?: WebSocket;

  constructor(host: string | undefined, port: number | undefined, events: PortixEventBus) {
    if (typeof WebSocket === 'undefined') {
      console.warn(
        'PortixOne: no global WebSocket available (needs a browser or Node 22+) — live job events are disabled, poll getJobs() instead.',
      );
      return;
    }

    const url = `ws://${host ?? DEFAULT_RUNTIME_HOST}:${port ?? DEFAULT_RUNTIME_PORT}`;
    this.socket = new WebSocket(url);
    this.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data as string) as WireMessage;
        events.emit(message.event, message.data);
      } catch {
        // ignore malformed frames
      }
    });
  }

  close(): void {
    this.socket?.close();
  }
}
