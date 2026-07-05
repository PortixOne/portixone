import type { PortixEvent, PortixEventHandler } from './types.js';

export class PortixEventBus {
  private readonly handlers = new Map<PortixEvent, Set<PortixEventHandler>>();

  on(event: PortixEvent, handler: PortixEventHandler): () => void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler);
    this.handlers.set(event, set);
    return () => set.delete(handler);
  }

  emit(event: PortixEvent, data: unknown): void {
    this.handlers.get(event)?.forEach((handler) => handler(data));
  }
}
