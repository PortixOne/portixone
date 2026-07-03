export const ESC = 0x1b;
export const GS = 0x1d;
export const LF = 0x0a;

export const ESCPOS_COMMANDS = {
  INIT: Buffer.from([ESC, 0x40]),
  CUT_FULL: Buffer.from([GS, 0x56, 0x00]),
  CUT_PARTIAL: Buffer.from([GS, 0x56, 0x01]),
  BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
  ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: Buffer.from([ESC, 0x61, 0x02]),
  LINE_FEED: Buffer.from([LF]),
} as const;
