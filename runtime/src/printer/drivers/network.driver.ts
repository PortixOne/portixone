import { Socket } from 'node:net';
import type { PrintJobInput } from '@portixone/protocol';
import { EscposBuilder } from '@portixone/escpos';
import { PrinterConnectionError, PrinterConnectionLostError, PrinterOfflineError, PrinterTimeoutError } from '@portixone/shared';
import type { PrinterDriver } from './printer-driver.types.js';

const CONNECT_TIMEOUT_MS = 5000;

/** Node socket error codes that mean "nothing is listening/reachable there" — i.e. the printer looks powered off or unreachable. */
const OFFLINE_CODES = new Set(['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'EHOSTDOWN']);

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
      let connected = false;
      const target = `${this.host}:${this.port}`;

      const fail = (error: Error & { code?: string }): void => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(this.classifyError(error, connected, target));
      };

      socket.setTimeout(CONNECT_TIMEOUT_MS);
      socket.once('timeout', () => fail(Object.assign(new Error('connection timed out'), { code: 'ETIMEDOUT' })));
      socket.once('error', (err: Error & { code?: string }) => fail(err));

      socket.connect(this.port, this.host, () => {
        connected = true;
        socket.write(buffer, (err) => {
          if (err) {
            fail(err);
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

  /**
   * Distinguishes "never reachable" (printer off / wrong address — before we
   * ever connected) from "was reachable, then wasn't" (connection dropped
   * mid-transfer — e.g. the printer's network interface died while
   * printing), since those call for different human messages.
   */
  private classifyError(error: Error & { code?: string }, connected: boolean, target: string): Error {
    if (error.code === 'ETIMEDOUT') {
      return new PrinterTimeoutError(target);
    }
    if (!connected && error.code && OFFLINE_CODES.has(error.code)) {
      return new PrinterOfflineError(target);
    }
    if (connected) {
      return new PrinterConnectionLostError(target);
    }
    return new PrinterConnectionError(`${target} — ${error.message}`);
  }
}
