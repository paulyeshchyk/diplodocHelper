// src/utils/yaml/Yaml_Read_BlockScalarHeader.test.ts

import { describe, expect, it } from '@jest/globals';
import { Yaml_Read_BlockScalarHeader } from './Yaml_Read_BlockScalarHeader.ts';

const read = Yaml_Read_BlockScalarHeader.read;

describe('Yaml_Read_BlockScalarHeader.read', () => {
  // === 1. Основной контракт ===
  it('00.9.3#01 ` |` → literal + clip, без комментария', () => {
    expect(read(' |')).toEqual({ style: 'literal', chomping: 'clip', comment: null, raw: ' |' });
  });

  it('00.9.3#02 ` |-` → literal + strip', () => {
    const r = read(' |-')!;
    expect(r.style).toBe('literal');
    expect(r.chomping).toBe('strip');
  });

  it('00.9.3#03 ` |+` → literal + keep', () => {
    const r = read(' |+')!;
    expect(r.chomping).toBe('keep');
  });

  it('00.9.3#04 ` >` → folded + clip', () => {
    const r = read(' >')!;
    expect(r.style).toBe('folded');
    expect(r.chomping).toBe('clip');
  });

  it('00.9.3#05 ` >-` → folded + strip', () => {
    const r = read(' >-')!;
    expect(r.style).toBe('folded');
    expect(r.chomping).toBe('strip');
  });

  // === 2. Edge-cases ===
  it('00.9.3#06 ` | # comment` → comment без `#`', () => {
    expect(read(' | # note')!.comment).toBe('note');
  });

  it('00.9.3#07 ` |  #  spaced` → comment trimmed', () => {
    expect(read(' |  #   spaced  ')!.comment).toBe('spaced');
  });

  it('00.9.3#08 ` foo` → null (не блочный скаляр)', () => {
    expect(read(' foo')).toBeNull();
  });

  it('00.9.3#09 `:value` (без пробела) → null', () => {
    expect(read(':value')).toBeNull();
  });

  // === 4. Frozen snapshot ===
  describe('frozen snapshot', () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      [' |', 'literal/clip/null'],
      [' |-', 'literal/strip/null'],
      [' |+', 'literal/keep/null'],
      [' >', 'folded/clip/null'],
      [' >+', 'folded/keep/null'],
      [' | # note', 'literal/clip/note'],
      [' foo', 'null'],
    ];
    it('00.9.3#90 should keep frozen decisions', () => {
      for (const [input, expected] of cases) {
        const r = read(input);
        const actual = r
          ? `${r.style}/${r.chomping}/${r.comment ?? 'null'}`
          : 'null';
        expect(actual).toBe(expected);
      }
    });
  });
});