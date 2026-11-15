// plugins/utils/logger/transports/ConsoleTransport.ts

import type { LogRecord, Transport } from './Transport.ts';
import type { LogLevel } from '../LogLevel.ts';

const C = {
  reset: '\x1b[0m', gray: '\x1b[90m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m',
};

/** Уровень → иконка. Все символы single-width в моноширинных терминалах. */
const LEVEL_ICON: Record<LogLevel, string> = {
  off: '',
  debug:   '·',
  info:    '●',
  warning: '▲',
  error:   '■',
};

/**
 * Ширина колонки `[module]`. Подобрана под самый длинный модуль проекта:
 * `[periodicTableHelpTag]` = 23 символа. +1 запас.
 */
const MODULE_WIDTH = 24;

export class ConsoleTransport implements Transport {
  private readonly useColor: boolean;
  constructor(useColor: boolean) {
    this.useColor = useColor && !!process.stdout.isTTY;
  }

  write(rec: LogRecord): void {
    const icon = LEVEL_ICON[rec.level] ?? '·';
    const moduleTag = `[${rec.module}]`;//.padEnd(MODULE_WIDTH);

    const head = this.useColor
      ? `${this.color(rec.level, icon)} ${C.cyan}${moduleTag}${C.reset}`
      : `${moduleTag} ${icon}`;

    const line = `${head} ${rec.msg}`;
    const stream = rec.level === 'error' || rec.level === 'warning'
      ? process.stderr
      : process.stdout;
    stream.write(line + '\n');
    if (rec.err?.stack && rec.level === 'debug') {
      stream.write(rec.err.stack + '\n');
    }
  }

  private color(level: string, s: string): string {
    if (level === 'error') return `${C.red}${s}${C.reset}`;
    if (level === 'warning') return `${C.yellow}${s}${C.reset}`;
    if (level === 'info') return `${C.bold}${s}${C.reset}`;
    return `${C.gray}${s}${C.reset}`;
  }
}