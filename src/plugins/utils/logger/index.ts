// plugins/utils/logger/index.ts

import * as path from 'node:path';
import { Logger, ScopedLogger } from './Logger.ts';
import type { LoggerConfig } from './LoggerConfig.ts';
import { DEFAULT_LOGGER_CONFIG, readFromEnv } from './LoggerConfig.ts';
import type { LogLevel } from './LogLevel.ts';
import { tryParseLevel } from './LogLevel.ts';
import { ConsoleTransport } from './transports/ConsoleTransport.ts';
import { FileTransport } from './transports/FileTransport.ts';
import { MultiTransport } from './transports/MultiTransport.ts';
import type { Transport } from './transports/Transport.ts';

export interface InitLoggerOptions extends Partial<LoggerConfig> {
  /** Escape hatch для тестов: подменить весь транспорт. */
  transport?: Transport;
}

let instance: Logger | null = null;

export function initLogger(opts: InitLoggerOptions = {}): Logger {
  const { transport: customTransport, ...cfgPart } = opts;
  const env = readFromEnv();

  const level: LogLevel = tryParseLevel(cfgPart.level) ?? tryParseLevel(env.level)
    ?? DEFAULT_LOGGER_CONFIG.level;

  const cfg: LoggerConfig = {
    ...DEFAULT_LOGGER_CONFIG, ...env, ...cfgPart, level,
  };

  let transport = customTransport;
  if (!transport) {
    const list: Transport[] = [];
    if (cfg.console) list.push(new ConsoleTransport(cfg.color));
    if (cfg.file) list.push(new FileTransport(path.resolve(cfg.file), cfg.format));
    transport = list.length > 1
      ? new MultiTransport(list)
      : list[0] ?? new ConsoleTransport(false);
  }

  if (instance) instance.close();
  instance = new Logger(cfg, transport);
  return instance;
}

/**
 * Возвращает `log()` — cached scoped-логгер для модуля.
 *
 * Кэш инвалидируется при:
 *   - пере-инициализации глобального `Logger` (новый instance)
 *   - изменении `opts.logLevel` (per-module override)
 *
 * Использование:
 *   const log = moduleLogger('comments', opts)();
 *   log.info('...');
 */
export function moduleLogger(moduleName: string, opts?: Record<string, unknown>): () => ScopedLogger {
  const levelOverride = typeof opts?.logLevel === 'string' ? opts.logLevel : null;
  let cached: ScopedLogger | null = null;
  let cachedFor: Logger | null = null;
  let cachedLevel: string | null = null;
  return () => {
    const current = getLogger();
    if (cachedFor !== current || cachedLevel !== levelOverride) {
      cached = current.child({
        module: moduleName,
        level: tryParseLevel(levelOverride) ?? undefined,
      });
      cachedFor = current;
      cachedLevel = levelOverride;
    }
    return cached!;
  };
}

export function getLogger(): Logger {
  return instance ?? initLogger();
}

/** Для ModuleDef / любых call-site с opts. */
export function createLogger(module: string, opts?: Record<string, unknown>): ScopedLogger {
  const level = tryParseLevel(opts?.logLevel);
  return getLogger().child({ module, level });
}

export function resetLogger(): void {
  if (instance) instance.close();
  instance = null;
}

export { DEFAULT_LOGGER_CONFIG } from './LoggerConfig.ts';
export type { LoggerConfig } from './LoggerConfig.ts';
export { isEnabled, parseLevel, tryParseLevel } from './LogLevel.ts';
export type { LogLevel } from './LogLevel.ts';
export type { LogRecord, Transport } from './transports/Transport.ts';
export { Logger, ScopedLogger };

