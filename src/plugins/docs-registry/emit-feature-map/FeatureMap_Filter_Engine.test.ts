import { describe, expect, it } from '@jest/globals';
import {
    FeatureMap_Filter_Engine,
    type ChipAttrs,
    type FilterState,
} from './FeatureMap_Filter_Engine.ts';

const DIMS = ['dim1', 'dim2', 'dim3', 'dim4'] as const;

function emptyState(): FilterState {
    const s: FilterState = { selected: {}, hovered: {} };
    for (const d of DIMS) {
        s.selected[d] = new Set();
        s.hovered[d] = null;
    }
    return s;
}

function stateWithSelected(pairs: Record<string, string[]>): FilterState {
    const s = emptyState();
    for (const [k, vs] of Object.entries(pairs)) s.selected[k] = new Set(vs);
    return s;
}

function stateWithHovered(pairs: Record<string, string>): FilterState {
    const s = emptyState();
    for (const [k, v] of Object.entries(pairs)) s.hovered[k] = v;
    return s;
}

const ALPHA: ChipAttrs = { dim1: ['a1'], dim2: ['b1'], dim3: ['c1'], dim4: ['d1'] };
const BETA:  ChipAttrs = { dim1: ['a2'], dim2: ['b2'], dim3: ['c2'], dim4: ['d2'] };
const GAMMA: ChipAttrs = { dim1: ['a1', 'a2'], dim2: ['b1'], dim3: ['c1', 'c2'], dim4: ['d1'] };

// ---------------------------------------------------------------------------
// attrsOf
// ---------------------------------------------------------------------------

describe('FeatureMap_Filter_Engine.attrsOf', () => {
    it('57.3#01 should split legacy space-separated values into arrays', () => {
        const a = FeatureMap_Filter_Engine.attrsOf({
            actor: 'ci techwriter',
            cap: 'cap-1 cap-2',
            layer: 'cli ui',
            family: 'fam-a fam-b',
        });
        expect(a.actor).toEqual(['ci', 'techwriter']);
        expect(a.capability).toEqual(['cap-1', 'cap-2']);
        expect(a.layer).toEqual(['cli', 'ui']);
        expect(a.family).toEqual(['fam-a', 'fam-b']);
    });

    it('57.3#02 should return empty arrays for legacy fallback on missing fields', () => {
        const a = FeatureMap_Filter_Engine.attrsOf({});
        expect(a.actor).toEqual([]);
        expect(a.capability).toEqual([]);
        expect(a.layer).toEqual([]);
        expect(a.family).toEqual([]);
    });

    it('57.3#03 should map data-cap → capability (legacy alias)', () => {
        const a = FeatureMap_Filter_Engine.attrsOf({ cap: 'cap-1' });
        expect(a.capability).toEqual(['cap-1']);
    });

    it('57.3#04 should drop empty tokens from extra whitespace', () => {
        const a = FeatureMap_Filter_Engine.attrsOf({ actor: '  ci   techwriter  ' });
        expect(a.actor).toEqual(['ci', 'techwriter']);
    });

    it('57.3#28 should prefer attrs object over legacy fields (Phase B)', () => {
        const a = FeatureMap_Filter_Engine.attrsOf({
            attrs: { dim1: ['v1', 'v2'], dim2: ['w1'] },
            actor: 'ignored',
        });
        expect(a.dim1).toEqual(['v1', 'v2']);
        expect(a.dim2).toEqual(['w1']);
        // legacy поля не смешиваются с attrs
        expect(a.actor).toBeUndefined();
    });

    it('57.3#29 should coerce non-array attrs values to []', () => {
        // Защита от невалидного JSON с не-array значениями.
        const a = FeatureMap_Filter_Engine.attrsOf({
            attrs: { dim1: ['v1'], dim2: 'not-array' as unknown as string[] },
        });
        expect(a.dim1).toEqual(['v1']);
        expect(a.dim2).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// needs
// ---------------------------------------------------------------------------

describe('FeatureMap_Filter_Engine.needs', () => {
    it('57.3#05 should return selected ∪ hovered for a key', () => {
        const s = emptyState();
        s.selected.dim1 = new Set(['a', 'b']);
        s.hovered.dim1 = 'c';
        expect(FeatureMap_Filter_Engine.needs(s, 'dim1')).toEqual(new Set(['a', 'b', 'c']));
    });

    it('57.3#06 should return a new Set (no mutation of state)', () => {
        const s = emptyState();
        s.selected.dim3 = new Set(['c1']);
        const result = FeatureMap_Filter_Engine.needs(s, 'dim3');
        result.add('c2');
        expect(s.selected.dim3).toEqual(new Set(['c1']));
    });

    it('57.3#07 should return empty set for unknown key with no filters', () => {
        expect(FeatureMap_Filter_Engine.needs(emptyState(), 'unknown')).toEqual(new Set());
    });
});

// ---------------------------------------------------------------------------
// anyActive
// ---------------------------------------------------------------------------

describe('FeatureMap_Filter_Engine.anyActive', () => {
    it('57.3#08 should be false for empty state', () => {
        expect(FeatureMap_Filter_Engine.anyActive(emptyState())).toBe(false);
    });

    it('57.3#09 should be true when any selected is set', () => {
        expect(FeatureMap_Filter_Engine.anyActive(stateWithSelected({ dim3: ['c1'] }))).toBe(true);
    });

    it('57.3#10 should be true when any hovered is set', () => {
        expect(FeatureMap_Filter_Engine.anyActive(stateWithHovered({ dim4: 'd1' }))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// computeChipClass
// ---------------------------------------------------------------------------

describe('FeatureMap_Filter_Engine.computeChipClass', () => {
    it('57.3#11 should return null when no filter is active', () => {
        expect(FeatureMap_Filter_Engine.computeChipClass(ALPHA, emptyState())).toBeNull();
    });

    it('57.3#12 should be is-highlight when selected matches', () => {
        expect(
            FeatureMap_Filter_Engine.computeChipClass(ALPHA, stateWithSelected({ dim3: ['c1'] })),
        ).toBe('is-highlight');
    });

    it('57.3#13 should be is-dimmed when selected does not match', () => {
        expect(
            FeatureMap_Filter_Engine.computeChipClass(ALPHA, stateWithSelected({ dim3: ['c2'] })),
        ).toBe('is-dimmed');
    });

    it('57.3#14 should AND multiple selected across dimensions', () => {
        expect(
            FeatureMap_Filter_Engine.computeChipClass(
                ALPHA,
                stateWithSelected({ dim3: ['c1'], dim4: ['d1'] }),
            ),
        ).toBe('is-highlight');
        expect(
            FeatureMap_Filter_Engine.computeChipClass(
                ALPHA,
                stateWithSelected({ dim3: ['c1'], dim4: ['d2'] }),
            ),
        ).toBe('is-dimmed');
    });

    it('57.3#15 should AND multiple selected inside one dimension (GAMMA has both)', () => {
        expect(
            FeatureMap_Filter_Engine.computeChipClass(
                GAMMA,
                stateWithSelected({ dim3: ['c1', 'c2'] }),
            ),
        ).toBe('is-highlight');
        expect(
            FeatureMap_Filter_Engine.computeChipClass(
                ALPHA,
                stateWithSelected({ dim3: ['c1', 'c2'] }),
            ),
        ).toBe('is-dimmed');
    });

    it('57.3#16 should be is-highlight when hover matches and selected matches', () => {
        const s = stateWithSelected({ dim3: ['c1'] });
        s.hovered.dim4 = 'd1';
        expect(FeatureMap_Filter_Engine.computeChipClass(ALPHA, s)).toBe('is-highlight');
    });

    it('57.3#17 should be is-preview-add when hover matches but selected does not', () => {
        const s = stateWithSelected({ dim3: ['c2'] });
        s.hovered.dim4 = 'd1';
        expect(FeatureMap_Filter_Engine.computeChipClass(ALPHA, s)).toBe('is-preview-add');
    });

    it('57.3#18 should be is-preview-drop when selected matches but hover does not', () => {
        const s = stateWithSelected({ dim3: ['c1'] });
        s.hovered.dim4 = 'd2';
        expect(FeatureMap_Filter_Engine.computeChipClass(ALPHA, s)).toBe('is-preview-drop');
    });

    it('57.3#19 should be is-dimmed when neither selected nor hover matches', () => {
        const s = stateWithSelected({ dim3: ['c2'] });
        s.hovered.dim4 = 'd2';
        expect(FeatureMap_Filter_Engine.computeChipClass(ALPHA, s)).toBe('is-dimmed');
    });
});

// ---------------------------------------------------------------------------
// computeCellClass
// ---------------------------------------------------------------------------

describe('FeatureMap_Filter_Engine.computeCellClass', () => {
    it('57.3#20 should return null when no filter is active', () => {
        expect(FeatureMap_Filter_Engine.computeCellClass([ALPHA], emptyState())).toBeNull();
    });

    it('57.3#21 should be is-cell-highlight when at least one chip is is-highlight', () => {
        expect(
            FeatureMap_Filter_Engine.computeCellClass([ALPHA, BETA], stateWithSelected({ dim3: ['c1'] })),
        ).toBe('is-cell-highlight');
    });

    it('57.3#22 should be is-cell-preview-add when no highlight but at least one preview-add', () => {
        const s = stateWithSelected({ dim3: ['c2'] });
        s.hovered.dim4 = 'd1';
        expect(FeatureMap_Filter_Engine.computeCellClass([ALPHA, BETA], s)).toBe('is-cell-preview-add');
    });

    it('57.3#23 should be is-dimmed when every chip is dimmed/preview-drop', () => {
        const s = stateWithSelected({ dim3: ['c2'] });
        s.hovered.dim4 = 'd2';
        expect(FeatureMap_Filter_Engine.computeCellClass([ALPHA], s)).toBe('is-dimmed');
    });
});

// ---------------------------------------------------------------------------
// computeVisibility
// ---------------------------------------------------------------------------

describe('FeatureMap_Filter_Engine.computeVisibility', () => {
    it('57.3#24 should report all shown and resetDisabled when no filter is active', () => {
        const r = FeatureMap_Filter_Engine.computeVisibility([ALPHA, BETA, GAMMA], emptyState());
        expect(r).toEqual({ shown: 3, total: 3, mode: 'plain', resetDisabled: true });
    });

    it('57.3#25 should report count of selected-matched chips in plain mode', () => {
        const r = FeatureMap_Filter_Engine.computeVisibility(
            [ALPHA, BETA, GAMMA],
            stateWithSelected({ dim3: ['c1'] }),
        );
        expect(r).toEqual({ shown: 2, total: 3, mode: 'plain', resetDisabled: false });
    });

    it('57.3#26 should count hovered ∩ selected (AND) in preview mode', () => {
        const s = stateWithSelected({ dim3: ['c1'] });
        s.hovered.dim4 = 'd1';
        const r = FeatureMap_Filter_Engine.computeVisibility([ALPHA, BETA, GAMMA], s);
        expect(r).toEqual({ shown: 2, total: 3, mode: 'preview', resetDisabled: false });
    });

    it('57.3#27 should use only hovered when selected is empty', () => {
        const r = FeatureMap_Filter_Engine.computeVisibility(
            [ALPHA, BETA, GAMMA],
            stateWithHovered({ dim1: 'a1' }),
        );
        expect(r).toEqual({ shown: 2, total: 3, mode: 'preview', resetDisabled: false });
    });
});