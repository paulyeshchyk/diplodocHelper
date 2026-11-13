export type LogLevel = 'off' | 'error' | 'warning' | 'info' | 'debug';

export const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = Object.freeze({
  off: 0, error: 1, warning: 2, info: 3, debug: 4,
});

export function tryParseLevel(v: unknown): LogLevel | undefined {
  if (typeof v !== 'string') return undefined;
  const lc = v.toLowerCase().trim();
  return lc in LEVEL_ORDER ? (lc as LogLevel) : undefined;
}

export function parseLevel(v: unknown, fallback: LogLevel = 'off'): LogLevel {
  return tryParseLevel(v) ?? fallback;
}

export function isEnabled(current: LogLevel, required: LogLevel): boolean {
  return LEVEL_ORDER[required] > 0 && LEVEL_ORDER[current] >= LEVEL_ORDER[required];
}