// src/utils/yaml/Yaml_Read_QuotedString.test.ts

import { describe, expect, it } from '@jest/globals';
import { Yaml_Read_QuotedString } from './Yaml_Read_QuotedString.ts';

const read = Yaml_Read_QuotedString.read;

describe('Yaml_Read_QuotedString.read', () => {
  // === 1. Основной контракт ===
  it('00.9.2#01 не с кавычки → null', () => {
    expect(read('text', 0)).toBeNull();
    expect(read('  text', 2)).toBeNull();
    expect(read('', 0)).toBeNull();
  });

  it('00.9.2#02 одинарные кавычки — closed', () => {
    const r = read("'abc'", 0)!;
    expect(r).toEqual({
      quoteChar: "'",
      startOffset: 0,
      endOffset: 5,
      contentStart: 1,
      contentEnd: 4,
      closed: true,
    });
  });

  it('00.9.2#03 двойные кавычки — closed', () => {
    const r = read('"abc"', 0)!;
    expect(r.quoteChar).toBe('"');
    expect(r.contentStart).toBe(1);
    expect(r.contentEnd).toBe(4);
    expect(r.closed).toBe(true);
  });

  // === 2. Edge-cases: escaping ===
  it('00.9.2#04 `\'\'` внутри — escaped одинарная', () => {
    const r = read("'it''s ok'", 0)!;
    expect(r.contentEnd).toBe(9);   // закрывающая на индексе 9
    expect(r.closed).toBe(true);
  });

  it('00.9.2#05 `\\"` внутри — escaped двойная', () => {
    const r = read('"a\\"b"', 0)!;
    expect(r.contentEnd).toBe(5);   // закрывающая на индексе 5, контент `a\"b` — [1..5)
    expect(r.endOffset).toBe(6);
    expect(r.closed).toBe(true);
  });

  it('00.9.2#06 `\\\\` внутри — escaped backslash', () => {
    const r = read('"a\\\\"', 0)!;
    expect(r.contentEnd).toBe(4);
    expect(r.closed).toBe(true);
  });

  it('00.9.2#07 незакрытая кавычка — closed: false, до конца строки', () => {
    const r = read("'unclosed", 0)!;
    expect(r.closed).toBe(false);
    expect(r.endOffset).toBe(9);
    expect(r.contentEnd).toBe(9);
  });

  it('00.9.2#08 пустые кавычки — contentStart === contentEnd', () => {
    const r = read('""', 0)!;
    expect(r.contentStart).toBe(1);
    expect(r.contentEnd).toBe(1);
    expect(r.closed).toBe(true);
  });

  it('00.9.2#09 начало не с нуля', () => {
    const r = read('key: \'x\'', 5)!;
    expect(r.startOffset).toBe(5);
    expect(r.contentStart).toBe(6);
    expect(r.contentEnd).toBe(7);
  });

  // === 4. Frozen snapshot ===
  describe('frozen snapshot', () => {
    const cases: ReadonlyArray<readonly [string, number, string]> = [
      ["'abc'", 0, 'single:closed'],
      ['"abc"', 0, 'double:closed'],
      ["'it''s'", 0, 'single:closed'],
      ['"a\\"b"', 0, 'double:closed'],
      ["'open", 0, 'single:open'],
      ['"open', 0, 'double:open'],
    ];
    it('00.9.2#90 should keep frozen decisions', () => {
      for (const [input, offset, expected] of cases) {
        const r = read(input, offset)!;
        expect(`${r.quoteChar === "'" ? 'single' : 'double'}:${r.closed ? 'closed' : 'open'}`).toBe(expected);
      }
    });
  });
});