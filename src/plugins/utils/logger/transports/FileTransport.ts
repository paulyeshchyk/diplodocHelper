import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LogRecord, Transport } from './Transport';

export class FileTransport implements Transport {
  private readonly stream: fs.WriteStream;
  private readonly format: 'text' | 'json' = 'json';

  constructor(filePath: string, format: 'text' | 'json' = 'json') {
    this.format = format;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.stream = fs.createWriteStream(filePath, { flags: 'a' });
  }

  write(rec: LogRecord): void {
    if (this.format === 'json') {
      const line = JSON.stringify({
        ts: rec.ts.toISOString(), level: rec.level, module: rec.module, msg: rec.msg,
        ...(rec.meta ? { meta: rec.meta } : {}),
        ...(rec.err ? { err: { name: rec.err.name, message: rec.err.message, stack: rec.err.stack } } : {}),
      });
      this.stream.write(line + '\n');
    } else {
      this.stream.write(
        `${rec.ts.toISOString()} ${rec.level.toUpperCase().padEnd(5)} [${rec.module}] ${rec.msg}\n`
      );
    }
  }

  close(): void { this.stream.end(); }
}