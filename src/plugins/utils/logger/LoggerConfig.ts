import type { LogLevel } from './LogLevel.ts';
import { tryParseLevel } from './LogLevel.ts';

export interface LoggerConfig {
  level: LogLevel;
  console: boolean;
  file: string | null;
  format: 'text' | 'json';
  color: boolean;
}

export const DEFAULT_LOGGER_CONFIG: Readonly<LoggerConfig> = Object.freeze({
  level: 'off',
  console: true,
  file: null,
  format: 'text',
  color: !!process.stdout.isTTY,
});

export function readFromEnv(env: NodeJS.ProcessEnv = process.env): Partial<LoggerConfig> {
  const out: Partial<LoggerConfig> = {};
  const lvl = tryParseLevel(env.DIPLODOC_LOG_LEVEL);
  if (lvl) out.level = lvl;
  if (env.DIPLODOC_LOG_FILE) out.file = env.DIPLODOC_LOG_FILE;
  const fmt = env.DIPLODOC_LOG_FORMAT;
  if (fmt === 'text' || fmt === 'json') out.format = fmt;
  return out;
}