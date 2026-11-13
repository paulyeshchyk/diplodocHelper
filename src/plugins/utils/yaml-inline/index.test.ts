// src/plugins/utils/yaml-inline/index.test.ts

import { describe, expect, it } from '@jest/globals';
import { Yaml_Analyze_Selection } from './index.ts';
import type { DocumentLike, Selection } from './yaml-inline.types.ts';

function mkDoc(text: string): DocumentLike {
  const lines = text.split('\n');
  const offsetAt = (pos: { line: number; character: number }): number => {
    let off = 0;
    for (let i = 0; i < pos.line; i++) off += lines[i].length + 1;
    return off + pos.character;
  };
  return {
    lineCount: lines.length,
    lineAt: (i: number) => ({ text: lines[i] }),
    getText: (sel?: Selection) =>
      sel ? text.slice(offsetAt(sel.start), offsetAt(sel.end)) : text,
    offsetAt,
  };
}

function mkSel(sl: number, sc: number, el: number, ec: number): Selection {
  return {
    start: { line: sl, character: sc },
    end: { line: el, character: ec },
    isEmpty: false,
  };
}

const SAMPLE = [
  '- term: Вид стандарта',
  '  definition: |-',
  '    характеристика стандарта',
  '    ещё текст',
  '  category:',
  '  description:',
].join('\n');

describe('yaml-inline/Yaml_Analyze_Selection', () => {
  // === 1. Основной контракт ===

  it('00.8.1#01 инлайн-value term проходит', () => {
    const doc = mkDoc(SAMPLE);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(0, 8, 0, 22));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.kind).toBe('inline');
  });

  it('00.8.1#04 значение внутри блочного скаляра проходит', () => {
    const doc = mkDoc(SAMPLE);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(2, 4, 2, 30));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.kind).toBe('block-scalar');
  });

  it('00.8.1#06 многострочное внутри одного блочного скаляра — ok', () => {
    const doc = mkDoc(SAMPLE);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(2, 4, 3, 14));
    expect(r.ok).toBe(true);
  });

  it('00.8.1#10 полный тег <a>...</a> проходит', () => {
    const text = '- term: |-\n    <a href="x">t</a>';
    const doc = mkDoc(text);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(1, 4, 1, 21));
    expect(r.ok).toBe(true);
  });

  it('00.8.1#12 <br> void проходит', () => {
    const text = '- term: |-\n    <br>Lorem<br/>';
    const doc = mkDoc(text);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(1, 4, 1, 22));
    expect(r.ok).toBe(true);
  });

  // === 2. Edge-cases: YAML-value guard ===

  it('00.8.1#02 выделение ключа term → отказ', () => {
    const doc = mkDoc(SAMPLE);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(0, 2, 0, 6));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasonCode).toBe('selection_before_value');
  });

  it('00.8.1#03 пересечение границы key:value → отказ', () => {
    const doc = mkDoc(SAMPLE);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(0, 2, 0, 22));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasonCode).toBe('selection_crosses_key_value');
  });

  it('00.8.1#05 индикатор |- → отказ', () => {
    const doc = mkDoc(SAMPLE);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(1, 14, 1, 16));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasonCode).toBe('on_block_scalar_indicator');
  });

  it('00.8.1#07 многострочное через два узла — отказ', () => {
    const doc = mkDoc(SAMPLE);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(0, 8, 2, 30));
    expect(r.ok).toBe(false);
  });

  it('00.8.1#08 курсор на key-строке (пустое значение) → отказ', () => {
    const doc = mkDoc(SAMPLE);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(4, 0, 4, 0));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasonCode).toBe('selection_before_value');
  });

  // === 2. Edge-cases: tag-guard ===

  it('00.8.1#09 фрагмент внутри тега → отказ', () => {
    const text = '- term: |-\n    см. <a href="x">ГОСТ</a>';
    const doc = mkDoc(text);
    // выделяем `href="x"` — это внутри <...>
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(1, 12, 1, 20));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasonCode).toMatch(/inside_tag/);
  });

  it('00.8.1#11 незакрытый тег → отказ', () => {
    const text = '- term: |-\n    <a href="x">t';
    const doc = mkDoc(text);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(1, 4, 1, 17));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasonCode).toBe('unbalanced_tags');
  });

  it('00.8.1#13 настоящая пустая строка внутри block-scalar → отказ', () => {
    const text = ['- term: X', '  definition: |-', '    line1', '', '    line3'].join('\n');
    const doc = mkDoc(text);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(3, 0, 3, 0));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasonCode).toBe('empty_line');
  });

  // === 4. Frozen snapshot (drift-guard после миграции) ===

  describe('frozen snapshot (legacy migrated)', () => {
    const cases: ReadonlyArray<readonly [string, Selection, 'ok' | string]> = [
      ['inline-value term', mkSel(0, 8, 0, 22), 'ok'],
      ['ключ term', mkSel(0, 2, 0, 6), 'selection_before_value'],
      ['пересечение key:value', mkSel(0, 2, 0, 22), 'selection_crosses_key_value'],
      ['value в block-scalar', mkSel(2, 4, 2, 30), 'ok'],
      ['индикатор |-', mkSel(1, 14, 1, 16), 'on_block_scalar_indicator'],
      ['курсор на key: (пустое значение)', mkSel(4, 0, 4, 0), 'selection_before_value'],
    ];

    it('00.8.1#90 should keep frozen guard decisions', () => {
      const doc = mkDoc(SAMPLE);
      for (const [, sel, expected] of cases) {
        const r = Yaml_Analyze_Selection.analyze(doc, sel);
        if (expected === 'ok') {
          expect(r.ok).toBe(true);
        } else {
          expect(r.ok).toBe(false);
          if (!r.ok) expect(r.reasonCode).toBe(expected);
        }
      }
    });
  });
});

describe('yaml-inline/Yaml_Analyze_Selection — owner', () => {
  it('00.8.1#14 inline → owner не null, valueStartCol указывает на значение', () => {
    const doc = mkDoc(SAMPLE);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(0, 8, 0, 22));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.owner).not.toBeNull();
      expect(r.owner!.line).toBe(0);
      expect(r.owner!.keyLine.valueStartCol).toBe(8);
    }
  });

  it('00.8.1#15 block-scalar → owner — key-line владельца', () => {
    const doc = mkDoc(SAMPLE);
    const r = Yaml_Analyze_Selection.analyze(doc, mkSel(2, 4, 2, 30));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.owner!.line).toBe(1);   // definition: |-
      expect(r.owner!.keyLine.isBlockScalar).toBe(true);
    }
  });
});