// src/utils/html/Html_Find_TagPairs.test.ts

import { describe, expect, it } from '@jest/globals';
import { Html_Find_TagPairs } from './Html_Find_TagPairs.ts';
import type { HtmlTagPair } from './Html_Find_TagPairs.types.ts';
import { Html_Tokenize_Inline } from './Html_Tokenize_Inline.ts';

const pairsOf = (s: string, names: string[]): HtmlTagPair[] =>
  Html_Find_TagPairs.pairs(
    Html_Tokenize_Inline.tokenize(s),
    new Set(names),
  );
const namesOf = (ps: HtmlTagPair[]): string[] =>
  ps.map(p => `${p.open.name}@${p.open.start}..${p.close.end}`);

describe('Html_Find_TagPairs.pairs', () => {
  // === 1. Основной контракт ===
  it('00.9.4#01 пустая строка → []', () => {
    expect(pairsOf('', ['b'])).toEqual([]);
  });
  it('00.9.4#02 текст без тегов → []', () => {
    expect(pairsOf('plain', ['b'])).toEqual([]);
  });
  it('00.9.4#03 одна пара <b>a</b>', () => {
    expect(namesOf(pairsOf('<b>a</b>', ['b']))).toEqual(['b@0..8']);
  });
  it('00.9.4#04 open без close → []', () => {
    expect(pairsOf('<b>a', ['b'])).toEqual([]);
  });
  it('00.9.4#05 close без open → []', () => {
    expect(pairsOf('a</b>', ['b'])).toEqual([]);
  });

  // === 2. Edge-cases ===
  it('00.9.4#06 только aliases-теги учитываются', () => {
    expect(namesOf(pairsOf('<span><b>a</b></span>', ['b']))).toEqual(['b@6..14']);
  });
  it('00.9.4#07 вложенность <b><i>x</i></b> — порядок по закрытию', () => {
    // открытие: b@0..3, i@3..6; закрытие: </i>@7..11, </b>@11..15
    expect(namesOf(pairsOf('<b><i>x</i></b>', ['b', 'i']))).toEqual([
      'i@3..11',
      'b@0..15',
    ]);
  });
  it('00.9.4#08 несколько пар одного типа', () => {
    expect(namesOf(pairsOf('<b>a</b><b>b</b>', ['b']))).toEqual([
      'b@0..8',
      'b@8..16',
    ]);
  });
  it('00.9.4#09 битая вложенность <b><i></b></i> — обе пары находятся', () => {
    // <b> @ 0..3, <i> @ 3..6, </b> @ 6..10, </i> @ 10..14
    // </b> находит последний open(b)@0; </i> находит open(i)@3
    expect(namesOf(pairsOf('<b><i></b></i>', ['b', 'i']))).toEqual([
      'b@0..10',
      'i@3..14',
    ]);
  });
  it('00.9.4#10 многоуровневое одного типа <b><b>x</b></b>', () => {
    // внутренний закрывается первым: inner @ 3..11, outer @ 0..15
    expect(namesOf(pairsOf('<b><b>x</b></b>', ['b']))).toEqual([
      'b@3..11',
      'b@0..15',
    ]);
  });

  // === 4. Frozen snapshot ===
  describe('frozen snapshot', () => {
    const cases: ReadonlyArray<readonly [string, readonly string[], readonly string[]]> = [
      ['<b>a</b>', ['b'], ['b@0..8']],
      ['<b><i>x</i></b>', ['b', 'i'], ['i@3..11', 'b@0..15']],
      ['<b><b>x</b></b>', ['b'], ['b@3..11', 'b@0..15']],
      ['<span><b>a</b></span>', ['b'], ['b@6..14']],
      ['<strong>x</strong>', ['strong'], ['strong@0..18']],
    ];
    it('00.9.4#90 should keep frozen pair extraction', () => {
      for (const [input, names, expected] of cases) {
        expect(namesOf(pairsOf(input, names as string[]))).toEqual(expected);
      }
    });
  });
});