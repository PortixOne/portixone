import { Socket } from 'node:net';
import type { PrintJobInput } from '@portixone/protocol';
import { EscposBuilder } from '@portixone/escpos';
import { PrinterConnectionError } from '@portixone/shared';
import type { PrinterDriver } from './printer-driver.types.js';

const CONNECT_TIMEOUT_MS = 5000;

/**
 * Sends raw ESC/POS bytes to a network/Ethernet thermal printer over its raw
 * print port (9100 by default — the de facto standard on Epson, Xprinter,
 * and most network-capable thermal printers).
 */
export class NetworkPrinterDriver implements PrinterDriver {
  constructor(
    private readonly host: string,
    private readonly port: number,
  ) {}

  async print(job: PrintJobInput): Promise<void> {
    const buffer = new EscposBuilder()
      .text(job.content)
      .feed(5)
      .cut()
      .build();

    const copies = job.copies ?? 1;
    for (let i = 0; i < copies; i += 1) {
      await this.sendToSocket(buffer);
    }
  }

  private sendToSocket(buffer: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      let settled = false;

      const fail = (message: string): void => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(new PrinterConnectionError(`${this.host}:${this.port} — ${message}`));
      };

      socket.setTimeout(CONNECT_TIMEOUT_MS);
      socket.once('timeout', () => fail('connection timed out'));
      socket.once('error', (err) => fail(err.message));

      socket.connect(this.port, this.host, () => {
        socket.write(buffer, (err) => {
          if (err) {
            fail(err.message);
            return;
          }
          socket.end();
        });
      });

      socket.once('close', () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      });
    });
  }
}
