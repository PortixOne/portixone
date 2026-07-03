import { ESCPOS_COMMANDS } from './escpos.constants.js';
import type { EscposTextOptions } from './escpos.types.js';

const ALIGN_COMMAND = {
  left: ESCPOS_COMMANDS.ALIGN_LEFT,
  center: ESCPOS_COMMANDS.ALIGN_CENTER,
  right: ESCPOS_COMMANDS.ALIGN_RIGHT,
} as const;

/**
 * Builds ESC/POS byte sequences for a print job. Pure — does not talk to any
 * hardware or OS printer queue; that's `runtime/src/printer/drivers`.
 */
export class EscposBuilder {
  private chunks: Buffer[] = [ESCPOS_COMMANDS.INIT];

  text(content: string, options: EscposTextOptions = {}): this {
    if (options.align) {
      this.chunks.push(ALIGN_COMMAND[options.align]);
    }
    if (options.bold) {
      this.chunks.push(ESCPOS_COMMANDS.BOLD_ON);
    }
    this.chunks.push(Buffer.from(content, 'utf-8'), ESCPOS_COMMANDS.LINE_FEED);
    if (options.bold) {
      this.chunks.push(ESCPOS_COMMANDS.BOLD_OFF);
    }
    return this;
  }

  feed(lines = 1): this {
    for (let i = 0; i < lines; i += 1) {
      this.chunks.push(ESCPOS_COMMANDS.LINE_FEED);
    }
    return this;
  }

  cut(): this {
    this.chunks.push(ESCPOS_COMMANDS.CUT_PARTIAL);
    return this;
  }

  build(): Buffer {
    return Buffer.concat(this.chunks);
  }
}
