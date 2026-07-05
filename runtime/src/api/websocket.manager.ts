import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { WS_EVENTS } from '@portixone/protocol';

export class WebSocketManager {
  private readonly wss: WebSocketServer;
  private readonly clients = new Set<WebSocket>();
  /**
   * Every client disconnect since boot — a proxy for "reconexiones" (Milestone
   * 4's metrics ask) until the SDK's WebSocket client actually implements
   * reconnect-on-drop, which it doesn't yet (see MILESTONE_3.md Phase 3).
   */
  private totalDisconnects = 0;

  constructor(httpServer: Server) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.wss.on('connection', (socket) => {
      this.clients.add(socket);
      socket.send(JSON.stringify({ event: WS_EVENTS.STATUS, data: { status: 'online' } }));
      socket.on('close', () => {
        this.clients.delete(socket);
        this.totalDisconnects += 1;
      });
    });
  }

  getStats(): { activeConnections: number; totalDisconnects: number } {
    return { activeConnections: this.clients.size, totalDisconnects: this.totalDisconnects };
  }

  broadcast(event: string, data: unknown): void {
    const message = JSON.stringify({ event, data });
    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  }

  close(): void {
    for (const client of this.clients) {
      client.close();
    }
    this.wss.close();
  }
}
