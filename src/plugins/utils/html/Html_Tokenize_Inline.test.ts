// src/utils/html/Html_Tokenize_Inline.test.ts

import { describe, expect, it } from '@jest/globals';
import { Html_Tokenize_Inline } from './Html_Tokenize_Inline.ts';
import type { InlineToken } from './Html_Tokenize_Inline.types.ts';

const t = Html_Tokenize_Inline.tokenize;
const shape = (tokens: InlineToken[]): Array<[string, string | undefined, string]> =>
  tokens.map(x => [x.type, x.name, x.raw]);

describe('Html_Tokenize_Inline.tokenize', () => {
  // === 1. Основной контракт ===
  it('00.9.1#01 пустая строка → []', () => {
    expect(t('')).toEqual([]);
  });

  it('00.9.1#02 только текст → один text-токен', () => {
    expect(shape(t('Lorem ipsum'))).toEqual([['text', undefined, 'Lorem ipsum']]);
  });

  it('00.9.1#03 <b>x</b> → open, text, close', () => {
    expect(shape(t('<b>x</b>'))).toEqual([
      ['open', 'b', '<b>'],
      ['text', undefined, 'x'],
      ['close', 'b', '</b>'],
    ]);
  });

  // === 2. Edge-cases ===
  it('00.9.1#04 <br> → void', () => {
    expect(shape(t('<br>'))).toEqual([['void', 'br', '<br>']]);
  });

  it('00.9.1#05 <br/> → void', () => {
    expect(shape(t('<br/>'))).toEqual([['void', 'br', '<br/>']]);
  });

  it('00.9.1#06 <a href="x>y">t</a> — `>` внутри кавычек не закрывает тег', () => {
    expect(shape(t('<a href="x>y">t</a>'))).toEqual([
      ['open', 'a', '<a href="x>y">'],
      ['text', undefined, 't'],
      ['close', 'a', '</a>'],
    ]);
  });

  it('00.9.1#07 <!-- comment --> → comment', () => {
    expect(shape(t('<!-- c -->'))).toEqual([['comment', undefined, '<!-- c -->']]);
  });

  it('00.9.1#08 a < b — `<` без имени тега, всё текст', () => {
    expect(shape(t('a < b'))).toEqual([['text', undefined, 'a < b']]);
  });

  it('00.9.1#09 незакрытый `<a` → весь остаток как текст', () => {
    expect(shape(t('before <a href="x"'))).toEqual([
      ['text', undefined, 'before <a href="x"'],
    ]);
  });

  it('00.9.1#10 смешанный поток', () => {
    expect(shape(t('a<b>c<i>d</i>e</b>f'))).toEqual([
      ['text', undefined, 'a'],
      ['open', 'b', '<b>'],
      ['text', undefined, 'c'],
      ['open', 'i', '<i>'],
      ['text', undefined, 'd'],
      ['close', 'i', '</i>'],
      ['text', undefined, 'e'],
      ['close', 'b', '</b>'],
      ['text', undefined, 'f'],
    ]);
  });

  it('00.9.1#11 filterText оставляет только text-токены', () => {
    const tokens = t('a<b>c</b>d');
    const texts = Html_Tokenize_Inline.filterText(tokens);
    expect(texts.map(x => x.raw)).toEqual(['a', 'c', 'd']);
  });

  // === 4. Frozen snapshot ===
  describe('frozen snapshot (legacy migrated)', () => {
    type Triple = readonly [string, string | null, string];
    const cases: ReadonlyArray<readonly [string, ReadonlyArray<Triple>]> = [
      ['', []],
      ['text', [['text', null, 'text']]],
      ['<b>x</b>', [['open', 'b', '<b>'], ['text', null, 'x'], ['close', 'b', '</b>']]],
      ['<br>', [['void', 'br', '<br>']]],
      ['<a href="x>y">t</a>', [['open', 'a', '<a href="x>y">'], ['text', null, 't'], ['close', 'a', '</a>']]],
    ];

    it('00.9.1#90 should keep frozen tokenization', () => {
      for (const [input, expected] of cases) {
        const actual: Triple[] = t(input).map(x => [x.type, x.name ?? null, x.raw]);
        expect(actual).toEqual(expected);
      }
    });
  });
});