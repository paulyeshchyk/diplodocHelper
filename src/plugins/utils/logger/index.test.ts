import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  createLogger,
  getLogger,
  initLogger,
  isEnabled,
  resetLogger,
  tryParseLevel,
} from './index';
import type { LogRecord, Transport } from './transports/Transport';

function memTransport(): Transport & { records: LogRecord[] } {
  const records: LogRecord[] = [];
  return { records, write: (r) => { records.push(r); } };
}

describe('logger', () => {
  let t: ReturnType<typeof memTransport>;
  beforeEach(() => { resetLogger(); t = memTransport(); initLogger({ transport: t, level: 'info' }); });

  it('00.7.0#01 filters by level', () => {
    getLogger().log('debug', 'm', 'hidden');
    getLogger().log('info', 'm', 'visible');
    expect(t.records.map(r => r.msg)).toEqual(['visible']);
  });

  it('00.7.0#02 child overrides level', () => {
    createLogger('m', { logLevel: 'debug' }).debug('shown');
    expect(t.records).toHaveLength(1);
  });

  it('00.7.0#03 error objects preserved', () => {
    const e = new Error('boom');
    getLogger().child({ module: 'm' }).error('failed', e);
    expect(t.records[0].err).toBe(e);
    expect(t.records[0].msg).toBe('failed');
  });

  it('00.7.0#04 parseLevel tolerates garbage', () => {
    expect(tryParseLevel('info')).toBe('info');
    expect(tryParseLevel('INFO')).toBe('info');
    expect(tryParseLevel('nonsense')).toBeUndefined();
  });

  it('00.7.0#05 isEnabled monotonic', () => {
    expect(isEnabled('info', 'debug')).toBe(false);
    expect(isEnabled('debug', 'info')).toBe(true);
    expect(isEnabled('off', 'off')).toBe(false);
  });
});