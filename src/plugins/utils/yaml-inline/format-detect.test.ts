// src/plugins/utils/yaml-inline/format-detect.test.ts

import { describe, expect, it } from '@jest/globals';
import { Html_Tokenize_Inline } from '../html/Html_Tokenize_Inline.ts';
import { Yaml_Detect_Format } from './format-detect.ts';

const isBold = (s: string, a: number, b: number) =>
  Yaml_Detect_Format.isWrappedBy(
    Html_Tokenize_Inline.tokenize(s),
    Yaml_Detect_Format.aliases.bold, a, b,
  );
const isItalic = (s: string, a: number, b: number) =>
  Yaml_Detect_Format.isWrappedBy(
    Html_Tokenize_Inline.tokenize(s),
    Yaml_Detect_Format.aliases.italic, a, b,
  );
const isMono = (s: string, a: number, b: number) =>
  Yaml_Detect_Format.isWrappedBy(
    Html_Tokenize_Inline.tokenize(s),
    Yaml_Detect_Format.aliases.mono, a, b,
  );

describe('Yaml_Detect_Format.isWrappedBy — сценарий A (selection внутри)', () => {
  it('00.8.2#01 <b>x</b>, selection = x → bold активен', () => {
    expect(isBold('<b>x</b>', 3, 4)).toBe(true);
  });
  it('00.8.2#02 <i>x</i>, selection = x → italic активен', () => {
    expect(isItalic('<i>x</i>', 3, 4)).toBe(true);
  });
  it('00.8.2#03 <kbd>x</kbd> → mono активен (canonical)', () => {
    // <kbd> = 5 chars: open [0..5), x = [5..6), close [6..12)
    expect(isMono('<kbd>x</kbd>', 5, 6)).toBe(true);
  });
  it('00.8.2#03b <tt>x</tt> → mono активен (legacy alias)', () => {
    expect(isMono('<tt>x</tt>', 4, 5)).toBe(true);
  });
  it('00.8.2#04 selection — префикс контента (не весь) → всё равно активен', () => {
    expect(isBold('<b>abcdef</b>', 3, 5)).toBe(true);
  });
});

describe('Yaml_Detect_Format.isWrappedBy — сценарий B (selection снаружи)', () => {
  it('00.8.2#05 selection = <b>x</b> целиком → bold активен', () => {
    expect(isBold('<b>x</b>', 0, 8)).toBe(true);
  });
  it('00.8.2#06 selection с префиксом до тега → bold активен', () => {
    // 'pre <b>x</b> post' — selection [4, 12) захватывает <b>x</b>
    expect(isBold('pre <b>x</b> post', 4, 12)).toBe(true);
  });
});

describe('Yaml_Detect_Format.isWrappedBy — алиасы', () => {
  it('00.8.2#07 <strong> = bold', () => {
    expect(isBold('<strong>x</strong>', 8, 9)).toBe(true);
  });
  it('00.8.2#08 <em> = italic', () => {
    expect(isItalic('<em>x</em>', 4, 5)).toBe(true);
  });
  // it('00.8.2#09 <code> = mono', () => {
  //   expect(isMono('<code>x</code>', 6, 7)).toBe(true);
  // });
  it('00.8.2#10 <b> НЕ активирует italic', () => {
    expect(isItalic('<b>x</b>', 3, 4)).toBe(false);
  });
});

describe('Yaml_Detect_Format.isWrappedBy — вложенность', () => {
  // <b><i>x</i></b>
  //  0    3  4  5       8      11
  it('00.8.2#11 selection = x внутри <b><i> → bold и italic активны', () => {
    expect(isBold('<b><i>x</i></b>', 6, 7)).toBe(true);
    expect(isItalic('<b><i>x</i></b>', 6, 7)).toBe(true);
  });
  it('00.8.2#12 selection = <i>x</i> внутри <b> → bold и italic активны', () => {
    expect(isBold('<b><i>x</i></b>', 3, 11)).toBe(true);
    expect(isItalic('<b><i>x</i></b>', 3, 11)).toBe(true);
  });
  it('00.8.2#13 selection = <b>x внутри <i> → ни один не активен', () => {
    // '<b>x' — незакрытый; пары нет, detect честно false
    expect(isBold('<b><i>x</i></b>', 0, 5)).toBe(false);
  });
});

describe('Yaml_Detect_Format.isWrappedBy — неактивные сценарии', () => {
  it('00.8.2#14 чистый текст → не активен', () => {
    expect(isBold('plain text', 0, 5)).toBe(false);
  });
  it('00.8.2#15 selection рядом, но не внутри → не активен', () => {
    expect(isBold('<b>x</b>y', 8, 9)).toBe(false);
  });
  it('00.8.2#16 граница open (start = open.end) — активно только если end до close', () => {
    // <b>|x</b> — start = 3 (граница open.end), end = 4 → сценарий A
    expect(isBold('<b>x</b>', 3, 4)).toBe(true);
  });
  it('00.8.2#17 selection на пустых скобках → активно (selection [open.end, close.start))', () => {
    // <b></b> — open.end = close.start = 3
    expect(isBold('<b></b>', 3, 3)).toBe(true);
  });
  it('00.8.2#18 две отдельные обёртки, selection между ними → не активен', () => {
    // <b>a</b>x<b>b</b>
    //  0...7   ^8  ^9...15
    expect(isBold('<b>a</b>x<b>b</b>', 8, 9)).toBe(false);
  });
});

describe('Yaml_Detect_Format.detect — агрегатор', () => {
  it('00.8.2#20 чистый текст → все false', () => {
    expect(Yaml_Detect_Format.detect('plain', 0, 5)).toEqual({
      bold: false, italic: false, mono: false,
    });
  });
  it('00.8.2#21 <b>x</b> → bold только', () => {
    expect(Yaml_Detect_Format.detect('<b>x</b>', 3, 4)).toEqual({
      bold: true, italic: false, mono: false,
    });
  });
  it('00.8.2#22 <b><i>x</i></b> → bold + italic', () => {
    expect(Yaml_Detect_Format.detect('<b><i>x</i></b>', 6, 7)).toEqual({
      bold: true, italic: true, mono: false,
    });
  });
  it('00.8.2#23 <b><i><tt>x</tt></i></b> → все три', () => {
    // <b><i><tt>x</tt></i></b>
    //  0  3  6  10 11  16 20  24
    const s = '<b><i><tt>x</tt></i></b>';
    expect(Yaml_Detect_Format.detect(s, 10, 11)).toEqual({
      bold: true, italic: true, mono: true,
    });
  });
  it('00.8.2#24 selection — префикс контента → триггеры по внешним тегам', () => {
    expect(Yaml_Detect_Format.detect('<b>abcdef</b>', 3, 5)).toEqual({
      bold: true, italic: false, mono: false,
    });
  });
});

// === 4. Frozen snapshot (drift-guard) ===
describe('Yaml_Detect_Format frozen snapshot', () => {
  const cases: ReadonlyArray<readonly [string, number, number, string]> = [
    ['<b>x</b>', 3, 4, 'b:1/i:0/m:0'],
    ['<i>x</i>', 3, 4, 'b:0/i:1/m:0'],
    ['<kbd>x</kbd>', 5, 6, 'b:0/i:0/m:1'],
    ['<tt>x</tt>', 4, 5, 'b:0/i:0/m:1'],
    ['<b><i>x</i></b>', 6, 7, 'b:1/i:1/m:0'],
    ['<b><i><tt>x</tt></i></b>', 10, 11, 'b:1/i:1/m:1'],
    ['<strong>x</strong>', 8, 9, 'b:1/i:0/m:0'],
    ['<em>x</em>', 4, 5, 'b:0/i:1/m:0'],
    // ['<code>x</code>', 6, 7, 'b:0/i:0/m:1'],
    ['plain', 0, 5, 'b:0/i:0/m:0'],
    ['<b>x</b>y', 8, 9, 'b:0/i:0/m:0'],
    ['<b>a</b>x<b>b</b>', 8, 9, 'b:0/i:0/m:0'],
  ];

  it('00.8.2#90 should keep frozen trigger decisions', () => {
    for (const [text, start, end, expected] of cases) {
      const r = Yaml_Detect_Format.detect(text, start, end);
      expect(`b:${+r.bold}/i:${+r.italic}/m:${+r.mono}`).toBe(expected);
    }
  });
});