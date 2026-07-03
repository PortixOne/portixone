import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { WS_EVENTS } from '@portixone/protocol';

export class WebSocketManager {
  private readonly wss: WebSocketServer;
  private readonly clients = new Set<WebSocket>();

  constructor(httpServer: Server) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.wss.on('connection', (socket) => {
      this.clients.add(socket);
      socket.send(JSON.stringify({ event: WS_EVENTS.STATUS, data: { status: 'online' } }));
      socket.on('close', () => this.clients.delete(socket));
    });
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
