import { describe, expect, it } from '@jest/globals';
import { parseArgs, toArgv } from './args.ts';
import type { ArgSpec } from './types.ts';

const specs: ArgSpec[] = [
  { name: 'lang', flag: '--lang', type: 'string', description: 'lang', default: 'ru' },
  { name: 'verbose', flag: '--verbose', type: 'boolean', description: 'verbose' },
  { name: 'count', flag: '--count', type: 'number', description: 'count' },
  { name: 'anchor', flag: '--anchor', type: 'string', description: 'anchor' },
];

describe('parseArgs', () => {
  it('00.7.1#01 should parse --key=value form', () => {
    const r = parseArgs(['--lang=en', '--anchor=naznachenie'], specs);
    expect(r.lang).toBe('en');
    expect(r.anchor).toBe('naznachenie');
  });

  it('00.7.1#02 should parse --key value form', () => {
    const r = parseArgs(['--lang', 'en', '--anchor', 'x'], specs);
    expect(r.lang).toBe('en');
    expect(r.anchor).toBe('x');
  });

  it('00.7.1#03 should parse boolean flags (no value, explicit true/false)', () => {
    expect(parseArgs(['--verbose'], specs).verbose).toBe(true);
    expect(parseArgs(['--verbose=true'], specs).verbose).toBe(true);
    expect(parseArgs(['--verbose=false'], specs).verbose).toBe(false);
  });

  it('00.7.1#04 should throw on unknown flag', () => {
    expect(() => parseArgs(['--unknown'], specs)).toThrow(/Неизвестный флаг/);
  });

  it('00.7.1#05 should coerce number and throw on bad number', () => {
    expect(parseArgs(['--count=5'], specs).count).toBe(5);
    expect(() => parseArgs(['--count=abc'], specs)).toThrow(/число/);
  });

  it('00.7.1#06 should seed defaults when flag not passed', () => {
    expect(parseArgs([], specs).lang).toBe('ru');
  });

  it('00.7.1#07 should throw when value missing for non-boolean', () => {
    expect(() => parseArgs(['--lang'], specs)).toThrow(/пропущено значение/);
    expect(() => parseArgs(['--lang', '--anchor=x'], specs)).toThrow(/пропущено значение/);
  });
});

describe('toArgv', () => {
  it('00.7.1#08 should serialize strings as --flag=value', () => {
    expect(toArgv({ lang: 'ru', anchor: 'x' })).toEqual(['--lang=ru', '--anchor=x']);
  });

  it('00.7.1#09 should serialize booleans as --flag (only when true)', () => {
    expect(toArgv({ verbose: true, dryRun: false })).toEqual(['--verbose']);
  });

  it('00.7.1#10 should skip null / undefined', () => {
    expect(toArgv({ lang: null, anchor: undefined, count: 0 })).toEqual(['--count=0']);
  });
});