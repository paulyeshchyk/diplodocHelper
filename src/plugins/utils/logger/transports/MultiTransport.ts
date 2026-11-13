import type { LogRecord, Transport } from './Transport';

export class MultiTransport implements Transport {
  private readonly transports: Transport[];

  constructor(transports: Transport[]) {
    this.transports = transports;
  }

  write(rec: LogRecord): void {
    for (const t of this.transports) t.write(rec);
  }

  close(): void {
    for (const t of this.transports) t.close?.();
  }
}