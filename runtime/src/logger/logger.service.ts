import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { formatLogEntry } from './logger.formatter.js';
import type { LogEntry, LogLevel } from './logger.types.js';

const LOG_PATH = join(process.cwd(), '.data', 'runtime.log');

export class LoggerService {
  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const entry: LogEntry = { level, message, timestamp: new Date().toISOString(), meta };
    const line = formatLogEntry(entry);

    if (level === 'error') {
      console.error(line);
    } else {
      console.log(line);
    }

    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, `${line}\n`, 'utf-8');
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write('error', message, meta);
  }
}
