// src/plugins/utils/yaml-inline/integration.test.ts

import { describe, expect, it } from '@jest/globals';
import { Yaml_Analyze_Selection } from './index.ts';
import { Yaml_Read_ValueRange } from './value-range.ts';
import { Yaml_Detect_Format } from './format-detect.ts';
import { Yaml_Toggle_Format } from './toggle-format.ts';
import type { FormatKey, FormatFlags } from './format-detect.types.ts';
import type { DocumentLike, Position, Selection } from './yaml-inline.types.ts';
import type { ToggleEdit } from './toggle-format.types.ts';

// ---------- helpers ----------

interface SimDoc extends DocumentLike {
    positionAt(offset: number): Position;
}

function mkDoc(text: string): SimDoc {
    const lines = text.split('\n');
    const offsetAt = (pos: Position): number => {
        let off = 0;
        for (let i = 0; i < pos.line; i++) off += lines[i].length + 1;
        return off + pos.character;
    };
    const positionAt = (offset: number): Position => {
        let remaining = offset;
        for (let i = 0; i < lines.length; i++) {
            if (remaining <= lines[i].length) return { line: i, character: remaining };
            remaining -= lines[i].length + 1;
        }
        return { line: lines.length - 1, character: lines[lines.length - 1].length };
    };
    return {
        lineCount: lines.length,
        lineAt: (i: number) => ({ text: lines[i] }),
        getText: (sel?: Selection) =>
            sel ? text.slice(offsetAt(sel.start), offsetAt(sel.end)) : text,
        offsetAt,
        positionAt,
    };
}

function mkSel(doc: SimDoc, startOff: number, endOff: number): Selection {
    return {
        start: doc.positionAt(startOff),
        end: doc.positionAt(endOff),
        isEmpty: startOff === endOff,
    };
}

/** Точная имитация `editor.edit(eb => for (e of edits) eb.replace(...))`. */
function applyEdits(text: string, edits: ReadonlyArray<ToggleEdit>): string {
    const sorted = [...edits].sort((a, b) => b.offset - a.offset);
    let result = text;
    for (const e of sorted) {
        result = result.slice(0, e.offset) + e.replacement + result.slice(e.offset + e.length);
    }
    return result;
}

// ---------- симулятор команды ----------

type SimResult =
    | {
        ok: true;
        action: 'wrapped' | 'unwrapped' | 'noop';
        /** detect **до** клика — что QuickPick показал */
        active: FormatFlags;
        /** detect **после** клика — для проверки результата */
        activeAfter: FormatFlags;
        newText: string;
        newSelStartOff: number;
        newSelEndOff: number;
    }
    | { ok: false; reasonCode: string };

function uxSimulate(
    text: string,
    selStartOff: number,
    selEndOff: number,
    key: FormatKey,
): SimResult {
    const doc = mkDoc(text);
    const sel = mkSel(doc, selStartOff, selEndOff);

    const analysis = Yaml_Analyze_Selection.analyze(doc, sel);
    if (!analysis.ok) return { ok: false, reasonCode: analysis.reasonCode };

    const range = Yaml_Read_ValueRange.read(doc, sel, analysis.kind, analysis.owner);
    const startOff = doc.offsetAt(range.start);
    const endOff = doc.offsetAt(range.end);

    const active = Yaml_Detect_Format.detect(text, startOff, endOff);
    const toggle = Yaml_Toggle_Format.toggle(text, startOff, endOff, key);
    const newText = applyEdits(text, toggle.edits);

    // detect на итоговом тексте — по контракту noop это = active
    const activeAfter = Yaml_Detect_Format.detect(newText, toggle.newStart, toggle.newEnd);

    return {
        ok: true,
        action: toggle.action,
        active,
        activeAfter,
        newText,
        newSelStartOff: toggle.newStart,
        newSelEndOff: toggle.newEnd,
    };
}

// ---------- 1. Basics (YAML-wrapped) ----------

describe('yaml-inline E2E — basics', () => {
    it('00.8.5#01 key: abc → wrap bold', () => {
        // key: abc
        //       ^^^ — [5, 8)
        const r = uxSimulate('key: abc', 5, 8, 'bold');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.action).toBe('wrapped');
        expect(r.active).toEqual({ bold: false, italic: false, mono: false });
        expect(r.newText).toBe('key: <b>abc</b>');
        expect(r.newSelStartOff).toBe(8);
        expect(r.newSelEndOff).toBe(11);
    });

    it('00.8.5#02 round-trip: wrap → unwrap → исходный yaml', () => {
        const s1 = uxSimulate('key: abc', 5, 8, 'bold');
        expect(s1.ok).toBe(true);
        if (!s1.ok) return;
        expect(s1.active.bold).toBe(false);

        const s2 = uxSimulate(s1.newText, s1.newSelStartOff, s1.newSelEndOff, 'bold');
        expect(s2.ok).toBe(true);
        if (!s2.ok) return;
        expect(s2.active.bold).toBe(true);
        expect(s2.action).toBe('unwrapped');
        expect(s2.newText).toBe('key: abc');
        expect(s2.newSelStartOff).toBe(5);
        expect(s2.newSelEndOff).toBe(8);
    });

    it('00.8.5#03 italic round-trip (shift 3)', () => {
        const s1 = uxSimulate('key: x', 5, 6, 'italic');
        expect(s1.ok).toBe(true);
        if (!s1.ok) return;
        expect(s1.newText).toBe('key: <i>x</i>');
        expect(s1.newSelStartOff).toBe(8);
        expect(s1.newSelEndOff).toBe(9);

        const s2 = uxSimulate(s1.newText, s1.newSelStartOff, s1.newSelEndOff, 'italic');
        expect(s2.ok).toBe(true);
        if (s2.ok) expect(s2.newText).toBe('key: x');
    });

    it('00.8.5#04 mono round-trip (shift 5 — <kbd> длиннее)', () => {
        const s1 = uxSimulate('key: x', 5, 6, 'mono');
        expect(s1.ok).toBe(true);
        if (!s1.ok) return;
        expect(s1.newText).toBe('key: <kbd>x</kbd>');
        expect(s1.newSelStartOff).toBe(10);   // 5 + 5
        expect(s1.newSelEndOff).toBe(11);     // 6 + 5
        const s2 = uxSimulate(s1.newText, s1.newSelStartOff, s1.newSelEndOff, 'mono');
        expect(s2.ok).toBe(true);
        if (s2.ok) expect(s2.newText).toBe('key: x');
    });
});

// ---------- 2. YAML-value: quote, block-scalar ----------

describe('yaml-inline E2E — YAML value', () => {
    it('00.8.5#10 key: \'abc\' — wrap внутрь кавычек', () => {
        // key: 'abc'
        //  0123456789
        const r = uxSimulate("key: 'abc'", 5, 10, 'bold');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.newText).toBe("key: '<b>abc</b>'");
        expect(r.newSelStartOff).toBe(9);   // 'abc' → '<b>abc</b>', abc сдвинулся на 3
        expect(r.newSelEndOff).toBe(12);
    });

    it('00.8.5#11 key: "abc" — тоже внутрь двойных кавычек', () => {
        const r = uxSimulate('key: "abc"', 5, 10, 'italic');
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.newText).toBe('key: "<i>abc</i>"');
    });

    it('00.8.5#12 block-scalar — wrap italic на слово в теле (14-символьное)', () => {
        // 'характеристика' = 14 chars (х-а-р-а-к-т-е-р-и-с-т-и-к-а)
        const text = ['- term: X', '  definition: |-', '    характеристика'].join('\n');
        const doc = mkDoc(text);
        const lineStart = doc.offsetAt({ line: 2, character: 0 });
        // 4 leading spaces + 14 chars
        const r = uxSimulate(text, lineStart + 4, lineStart + 18, 'italic');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.newText).toBe(
            '- term: X\n  definition: |-\n    <i>характеристика</i>',
        );
    });
});

// ---------- 3. Guard failures (проброс через всю команду) ----------

describe('yaml-inline E2E — guard failures', () => {
    it('00.8.5#20 выделение ключа → отказ', () => {
        const r = uxSimulate('key: value', 0, 3, 'bold');
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reasonCode).toBe('selection_before_value');
    });

    it('00.8.5#21 выделение внутри тега → отказ', () => {
        const text = '- term: |-\n    <a href="x">t</a>';
        const doc = mkDoc(text);
        const lineStart = doc.offsetAt({ line: 1, character: 0 });
        const r = uxSimulate(text, lineStart + 12, lineStart + 20, 'bold');
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reasonCode).toMatch(/inside_tag/);
    });
});

// ---------- 4. Multi-step (вложенность) ----------

describe('yaml-inline E2E — multi-step', () => {
    it('00.8.5#30 wrap bold, потом wrap italic на том же x → <b><i>x</i></b>', () => {
        const s1 = uxSimulate('key: x', 5, 6, 'bold');
        expect(s1.ok).toBe(true);
        if (!s1.ok) return;
        expect(s1.newText).toBe('key: <b>x</b>');
        expect(s1.activeAfter).toEqual({ bold: true, italic: false, mono: false });

        const s2 = uxSimulate(s1.newText, s1.newSelStartOff, s1.newSelEndOff, 'italic');
        expect(s2.ok).toBe(true);
        if (!s2.ok) return;
        expect(s2.newText).toBe('key: <b><i>x</i></b>');
        expect(s2.active).toEqual({ bold: true, italic: false, mono: false });      // до клика
        expect(s2.activeAfter).toEqual({ bold: true, italic: true, mono: false });   // после клика
    });

    it('00.8.5#31 toggle bold на <b><i>x</i></b> — снимает внешний, оставляет <i>', () => {
        // key: <b><i>x</i></b>
        //  0123456789012345678
        const r = uxSimulate('key: <b><i>x</i></b>', 11, 12, 'bold');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.action).toBe('unwrapped');
        expect(r.newText).toBe('key: <i>x</i>');
        expect(r.active).toEqual({ bold: true, italic: true, mono: false });         // до
        expect(r.activeAfter).toEqual({ bold: false, italic: true, mono: false });   // после — italic остался
        expect(r.newSelStartOff).toBe(8);
        expect(r.newSelEndOff).toBe(9);
    });

    it('00.8.5#32 toggle italic на <b><i>x</i></b> — снимает внутренний, оставляет <b>', () => {
        const r = uxSimulate('key: <b><i>x</i></b>', 11, 12, 'italic');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.newText).toBe('key: <b>x</b>');
        expect(r.active).toEqual({ bold: true, italic: true, mono: false });         // до
        expect(r.activeAfter).toEqual({ bold: true, italic: false, mono: false });   // после — bold остался
    });
});

// ---------- 5. Инварианты (чистые, без guard) ----------

describe('yaml-inline E2E — invariants', () => {
    it('00.8.5#40 ToggleResult.text === applyEdits(original, edits)', () => {
        const cases: Array<[string, number, number, FormatKey]> = [
            ['abc', 0, 3, 'bold'],
            ['<b>abc</b>', 3, 6, 'bold'],
            ['<b>abc</b>', 0, 10, 'bold'],
            ['<b><i>x</i></b>', 6, 7, 'bold'],
            ['<b><i>x</i></b>', 6, 7, 'italic'],
            ['<tt>x</tt>', 4, 5, 'mono'],
        ];
        for (const [text, s, e, key] of cases) {
            const r = Yaml_Toggle_Format.toggle(text, s, e, key);
            expect(r.text).toBe(applyEdits(text, r.edits));
        }
    });

    it('00.8.5#41 edits отсортированы desc и не пересекаются', () => {
        const r = Yaml_Toggle_Format.toggle('<b>abc</b>', 0, 10, 'bold');
        for (let i = 1; i < r.edits.length; i++) {
            const prev = r.edits[i - 1];
            const curr = r.edits[i];
            expect(prev.offset).toBeGreaterThanOrEqual(curr.offset + curr.length);
        }
    });

    it('00.8.5#42 wrap всегда даёт канонический тег; unwrap снимает любой алиас', () => {
        const wrapped = Yaml_Toggle_Format.toggle('x', 0, 1, 'bold');
        expect(wrapped.text).toBe('<b>x</b>');
        const unwrapped = Yaml_Toggle_Format.toggle('<strong>x</strong>', 8, 9, 'bold');
        expect(unwrapped.text).toBe('x');
        expect(unwrapped.action).toBe('unwrapped');
    });
});

// ---------- 6. Frozen snapshot (drift-guard) ----------

describe('yaml-inline E2E frozen snapshot', () => {
    type Case = readonly [
        input: string,
        selStart: number,
        selEnd: number,
        key: FormatKey,
        expectedText: string,
        expectedAction: string,
    ];

    // Все входы — валидный YAML. Офсеты — с комментарием-схемой.
    const cases: ReadonlyArray<Case> = [
        // wrap: plain scalar
        ['key: abc', 5, 8, 'bold', 'key: <b>abc</b>', 'wrapped'],
        ['key: x', 5, 6, 'italic', 'key: <i>x</i>', 'wrapped'],
        ['key: x', 5, 6, 'mono', 'key: <kbd>x</kbd>', 'wrapped'],
        // unwrap A: selection внутри контента
        // key: <b>abc</b>  →  x в [8, 11); open_b=5..8, close_b=11..15
        ['key: <b>abc</b>', 8, 11, 'bold', 'key: abc', 'unwrapped'],
        // key: <b><i>x</i></b> → x в [11, 12)
        ['key: <b><i>x</i></b>', 11, 12, 'bold', 'key: <i>x</i>', 'unwrapped'],
        ['key: <b><i>x</i></b>', 11, 12, 'italic', 'key: <b>x</b>', 'unwrapped'],
        // unwrap B: selection захватывает теги снаружи
        // key: <b>abc</b> → whole <b>abc</b> = [5, 15)
        ['key: <b>abc</b>', 5, 15, 'bold', 'key: abc', 'unwrapped'],
        // key: <strong>x</strong> → x в [13, 14)
        ['key: <strong>x</strong>', 13, 14, 'bold', 'key: x', 'unwrapped'],
        // quoted: wrap внутрь кавычек
        ["key: 'abc'", 5, 10, 'bold', "key: '<b>abc</b>'", 'wrapped'],
    ];

    it('00.8.5#90 should keep frozen E2E outcomes', () => {
        for (const [input, ss, se, key, expectedText, expectedAction] of cases) {
            const r = uxSimulate(input, ss, se, key);
            expect(r.ok).toBe(true);
            if (!r.ok) continue;
            expect(r.action).toBe(expectedAction);
            expect(r.newText).toBe(expectedText);
        }
    });
});