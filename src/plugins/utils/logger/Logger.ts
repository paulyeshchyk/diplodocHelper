import type { LogLevel } from './LogLevel.ts';
import { isEnabled } from './LogLevel.ts';
import type { LoggerConfig } from './LoggerConfig.ts';
import type { Transport } from './transports/Transport.ts';

export interface ChildOptions {
  module: string;
  level?: LogLevel;
  meta?: Record<string, unknown>;
}

export class Logger {
  private readonly config: Readonly<LoggerConfig>;
  private readonly transport: Transport;

  constructor(config: Readonly<LoggerConfig>, transport: Transport) {
    this.config = config;
    this.transport = transport;
  }

  get level(): LogLevel { return this.config.level; }

  /** Единый вход «модульный» метод — используется legacy-кодом напрямую. */
  log(level: LogLevel, module: string, msg: string, metaOrErr?: Record<string, unknown> | Error): void {
    if (!isEnabled(this.config.level, level)) return;
    const extra = splitMetaAndErr(metaOrErr);
    this.transport.write({ ts: new Date(), level, module, msg, ...extra });
  }

  child(opts: ChildOptions): ScopedLogger {
    return new ScopedLogger(this.transport, this.config.level, opts);
  }

  close(): void { this.transport.close?.(); }
}

export class ScopedLogger {

  private readonly transport: Transport;
  private readonly globalLevel: LogLevel;
  private readonly opts: ChildOptions;

  constructor(transport: Transport, globalLevel: LogLevel, opts: ChildOptions) {
    this.transport = transport;
    this.globalLevel = globalLevel;
    this.opts = opts;
  }



  debug(msg: string, meta?: Record<string, unknown>): void {
    this.emit('debug', msg, { meta });
  }
  info(msg: string, meta?: Record<string, unknown>): void {
    this.emit('info', msg, { meta });
  }
  warn(msg: string, metaOrErr?: Record<string, unknown> | Error): void {
    this.emit('warning', msg, splitMetaAndErr(metaOrErr));
  }
  error(msg: string, metaOrErr?: Record<string, unknown> | Error): void {
    this.emit('error', msg, splitMetaAndErr(metaOrErr));
  }

  private emit(level: LogLevel, msg: string, extra: { meta?: Record<string, unknown>; err?: Error }): void {
    const effective = this.opts.level ?? this.globalLevel;
    if (!isEnabled(effective, level)) return;
    this.transport.write({
      ts: new Date(), level, module: this.opts.module, msg,
      meta: { ...(this.opts.meta ?? {}), ...(extra.meta ?? {}) },
      ...(extra.err ? { err: extra.err } : {}),
    });
  }
}

function splitMetaAndErr(v?: Record<string, unknown> | Error): { meta?: Record<string, unknown>; err?: Error } {
  if (v instanceof Error) return { err: v };
  if (v && typeof v === 'object') return { meta: v };
  return {};
}