import type { LogLevel } from '../LogLevel';

export interface LogRecord {
  ts: Date;
  level: LogLevel;
  module: string;
  msg: string;
  meta?: Record<string, unknown>;
  err?: Error;
}

export interface Transport {
  write(rec: LogRecord): void;
  close?(): void;
}