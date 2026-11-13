import type { LogRecord, Transport } from './Transport.ts';

const C = {
  reset: '\x1b[0m', gray: '\x1b[90m', red: '\x1b[31m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m',
};

export class ConsoleTransport implements Transport {
  private readonly useColor: boolean;
  constructor(useColor: boolean) {
    this.useColor = useColor && !!process.stdout.isTTY;
  }

  write(rec: LogRecord): void {
    const tag = `[${rec.module}]`.padEnd(14);
    const lvl = rec.level.toUpperCase().padEnd(5);
    const head = this.useColor
      ? `${C.cyan}${tag}${C.reset} ${this.color(rec.level, lvl)}`
      : `${tag} ${lvl}`;
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