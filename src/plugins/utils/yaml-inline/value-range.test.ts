// src/plugins/utils/yaml-inline/value-range.test.ts

import { describe, expect, it } from '@jest/globals';
import { Yaml_Read_ValueRange } from './value-range.ts';
import type {
  DocumentLike,
  OwnerKeyLine,
  Selection,
  ValueContextKind,
} from './yaml-inline.types.ts';

function mkDoc(lineText: string): DocumentLike {
  return {
    lineCount: 1,
    lineAt: () => ({ text: lineText }),
    getText: () => lineText,
    offsetAt: () => 0,
  };
}

function mkSel(sc: number, ec: number): Selection {
  return {
    start: { line: 0, character: sc },
    end: { line: 0, character: ec },
    isEmpty: sc === ec,
  };
}

function inlineOwner(valueStartCol: number): OwnerKeyLine {
  return {
    line: 0, indent: 0,
    keyLine: { bulletLen: 0, keyStartCol: 0, colonCol: 0, valueStartCol, isBlockScalar: false },
  };
}

function blockOwner(): OwnerKeyLine {
  return {
    line: 0, indent: 0,
    keyLine: { bulletLen: 0, keyStartCol: 0, colonCol: 0, valueStartCol: -1, isBlockScalar: true },
  };
}

const run = (
  lineText: string, sc: number, ec: number,
  kind: ValueContextKind, owner: OwnerKeyLine | null,
) => Yaml_Read_ValueRange.read(mkDoc(lineText), mkSel(sc, ec), kind, owner);

describe('Yaml_Read_ValueRange.read — plain scalar', () => {
  it('00.8.4#01 selection = весь plain value', () => {
    const r = run('key: abc', 5, 8, 'inline', inlineOwner(5));
    expect(r).toEqual({ start: { line: 0, character: 5 }, end: { line: 0, character: 8 } });
  });

  it('00.8.4#02 selection внутри plain → без изменений', () => {
    const r = run('key: abc', 6, 7, 'inline', inlineOwner(5));
    expect(r).toEqual({ start: { line: 0, character: 6 }, end: { line: 0, character: 7 } });
  });

  it('00.8.4#03 trailing spaces не входят в contentRange', () => {
    const r = run('key: abc   ', 5, 11, 'inline', inlineOwner(5));
    expect(r.start.character).toBe(5);
    expect(r.end.character).toBe(8);
  });

  it('00.8.4#04 #comment не входит в contentRange', () => {
    const r = run('key: abc # comment', 5, 19, 'inline', inlineOwner(5));
    expect(r.start.character).toBe(5);
    expect(r.end.character).toBe(8);
  });

  it('00.8.4#05 `#` без пробела перед — часть plain scalar', () => {
    const r = run('key: abc#def', 5, 12, 'inline', inlineOwner(5));
    expect(r.end.character).toBe(12);
  });
});

describe('Yaml_Read_ValueRange.read — single-quoted', () => {
  it('00.8.4#10 selection с кавычками → contentRange без кавычек', () => {
    // key: 'abc'
    //      0123456789 (индексы)
    const r = run("key: 'abc'", 5, 10, 'inline', inlineOwner(5));
    expect(r).toEqual({ start: { line: 0, character: 6 }, end: { line: 0, character: 9 } });
  });

  it('00.8.4#11 selection только контент → без изменений', () => {
    const r = run("key: 'abc'", 6, 9, 'inline', inlineOwner(5));
    expect(r).toEqual({ start: { line: 0, character: 6 }, end: { line: 0, character: 9 } });
  });

  it('00.8.4#12 selection с одной кавычкой → clamp к contentStart', () => {
    const r = run("key: 'abc'", 5, 8, 'inline', inlineOwner(5));
    expect(r).toEqual({ start: { line: 0, character: 6 }, end: { line: 0, character: 8 } });
  });

  it('00.8.4#13 пустой value `\'\'` → пустой contentRange', () => {
    // key: ''
    //      01234567
    const r = run("key: ''", 5, 8, 'inline', inlineOwner(5));
    expect(r.start.character).toBe(6);
    expect(r.end.character).toBe(6);
  });
});

describe('Yaml_Read_ValueRange.read — double-quoted', () => {
  it('00.8.4#15 selection с кавычками', () => {
    const r = run('key: "abc"', 5, 10, 'inline', inlineOwner(5));
    expect(r).toEqual({ start: { line: 0, character: 6 }, end: { line: 0, character: 9 } });
  });

  it('00.8.4#16 escaped \\" внутри — contentEnd до закрывающей', () => {
    // key: "a\"b"
    //  0 1 2 3 4 5 6 7 8 9 10
    const r = run('key: "a\\"b"', 5, 12, 'inline', inlineOwner(5));
    expect(r.start.character).toBe(6);
    expect(r.end.character).toBe(10);   // ← было 11
  });
});

describe('Yaml_Read_ValueRange.read — fallback', () => {
  it('00.8.4#20 block-scalar → contentRange = selection', () => {
    const r = Yaml_Read_ValueRange.read(
      mkDoc('x'),
      { start: { line: 3, character: 4 }, end: { line: 5, character: 10 }, isEmpty: false },
      'block-scalar', blockOwner(),
    );
    expect(r.start).toEqual({ line: 3, character: 4 });
    expect(r.end).toEqual({ line: 5, character: 10 });
  });

  it('00.8.4#21 inline без owner → selection', () => {
    const r = run('key: abc', 5, 8, 'inline', null);
    expect(r.start.character).toBe(5);
    expect(r.end.character).toBe(8);
  });

  it('00.8.4#22 inline с isBlockScalar в owner → selection (defense-in-depth)', () => {
    const r = run('key: abc', 5, 8, 'inline', blockOwner());
    expect(r.start.character).toBe(5);
    expect(r.end.character).toBe(8);
  });
});

// === 4. Frozen snapshot (drift-guard) ===
describe('Yaml_Read_ValueRange frozen snapshot', () => {
  // [lineText, valueStartCol, selStart, selEnd, expectedStart, expectedEnd]
  const cases: ReadonlyArray<readonly [string, number, number, number, number, number]> = [
    ['key: abc', 5, 5, 8, 5, 8],
    ['key: abc', 5, 6, 7, 6, 7],
    ['key: abc   ', 5, 5, 11, 5, 8],
    ['key: abc # comment', 5, 5, 19, 5, 8],
    ['key: abc#def', 5, 5, 12, 5, 12],
    ["key: 'abc'", 5, 5, 10, 6, 9],
    ["key: 'abc'", 5, 6, 9, 6, 9],
    ["key: 'abc'", 5, 5, 8, 6, 8],
    ["key: ''", 5, 5, 8, 6, 6],
    ['key: "abc"', 5, 5, 10, 6, 9],
    ['key: "a\\"b"', 5, 5, 12, 6, 10],
  ];

  it('00.8.4#90 should keep frozen value-range decisions', () => {
    for (const [lineText, vsc, ss, se, expectedStart, expectedEnd] of cases) {
      const r = run(lineText, ss, se, 'inline', inlineOwner(vsc));
      expect(r.start.character).toBe(expectedStart);
      expect(r.end.character).toBe(expectedEnd);
    }
  });
});