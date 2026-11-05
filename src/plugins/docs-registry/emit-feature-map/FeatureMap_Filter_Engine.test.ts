import { describe, expect, it } from '@jest/globals';
import {
    FeatureMap_Filter_Engine,
    STRIP_KEYS,
    type ChipAttrs,
    type FilterState,
    type StripKey,
} from './FeatureMap_Filter_Engine.ts';

// ---------------------------------------------------------------------------
// Хелперы для построения state
// ---------------------------------------------------------------------------

function emptyState(): FilterState {
    return {
        selected: {
            actor: new Set(),
            capability: new Set(),
            layer: new Set(),
            family: new Set(),
        },
        hovered: {
            actor: null,
            capability: null,
            layer: null,
            family: null,
        },
    };
}

function stateWithSelected(pairs: Partial<Record<StripKey, string[]>>): FilterState {
    const s = emptyState();
    for (const [k, vs] of Object.entries(pairs) as Array<[StripKey, string[]]>) {
        s.selected[k] = new Set(vs);
    }
    return s;
}

function stateWithHovered(pairs: Partial<Record<StripKey, string>>): FilterState {
    const s = emptyState();
    for (const [k, v] of Object.entries(pairs) as Array<[StripKey, string]>) {
        s.hovered[k] = v;
    }
    return s;
}

/** Чип «ALPHA»: actor=ci, cap=cap-1, layer=cli, family=fam-a. */
const ALPHA: ChipAttrs = {
    actor: ['ci'],
    capability: ['cap-1'],
    layer: ['cli'],
    family: ['fam-a'],
};

/** Чип «BETA»: actor=techwriter, cap=cap-2, layer=ui, family=fam-b. */
const BETA: ChipAttrs = {
    actor: ['techwriter'],
    capability: ['cap-2'],
    layer: ['ui'],
    family: ['fam-b'],
};

/** Чип «DELTA»: actor=ci, cap=cap-2, layer=cli, family=fam-b. */
const DELTA: ChipAttrs = {
    actor: ['ci'],
    capability: ['cap-2'],
    layer: ['cli'],
    family: ['fam-b'],
};

/** Чип «GAMMA»: actor=[ci, techwriter], cap=cap-1, layer=[cli, ui], family=fam-a. */
const GAMMA: ChipAttrs = {
    actor: ['ci', 'techwriter'],
    capability: ['cap-1'],
    layer: ['cli', 'ui'],
    family: ['fam-a'],
};

// ---------------------------------------------------------------------------
// attrsOf
// ---------------------------------------------------------------------------

describe('FeatureMap_Filter_Engine.attrsOf', () => {
    it('57.3#01 should split space-separated values into arrays', () => {
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

    it('57.3#02 should return empty arrays for missing / empty fields', () => {
        const a = FeatureMap_Filter_Engine.attrsOf({});
        for (const k of STRIP_KEYS) expect(a[k]).toEqual([]);
    });

    it('57.3#03 should map data-cap → capability (dataset has short name)', () => {
        const a = FeatureMap_Filter_Engine.attrsOf({ cap: 'cap-1' });
        expect(a.capability).toEqual(['cap-1']);
    });

    it('57.3#04 should drop empty tokens from extra whitespace', () => {
        const a = FeatureMap_Filter_Engine.attrsOf({ actor: '  ci   techwriter  ' });
        expect(a.actor).toEqual(['ci', 'techwriter']);
    });
});

// ---------------------------------------------------------------------------
// needs
// ---------------------------------------------------------------------------

describe('FeatureMap_Filter_Engine.needs', () => {
    it('57.3#05 should return selected ∪ hovered for a key', () => {
        const s = emptyState();
        s.selected.actor = new Set(['a', 'b']);
        s.hovered.actor = 'c';
        expect(FeatureMap_Filter_Engine.needs(s, 'actor')).toEqual(new Set(['a', 'b', 'c']));
    });

    it('57.3#06 should return a new Set (no mutation of state)', () => {
        const s = emptyState();
        s.selected.layer = new Set(['cli']);
        const result = FeatureMap_Filter_Engine.needs(s, 'layer');
        result.add('ui');
        expect(s.selected.layer).toEqual(new Set(['cli']));
    });

    it('57.3#07 should return empty set for unknown key with no filters', () => {
        expect(FeatureMap_Filter_Engine.needs(emptyState(), 'family')).toEqual(new Set());
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
        expect(FeatureMap_Filter_Engine.anyActive(stateWithSelected({ layer: ['cli'] }))).toBe(true);
    });

    it('57.3#10 should be true when any hovered is set', () => {
        expect(FeatureMap_Filter_Engine.anyActive(stateWithHovered({ family: 'fam-a' }))).toBe(true);
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
            FeatureMap_Filter_Engine.computeChipClass(ALPHA, stateWithSelected({ layer: ['cli'] })),
        ).toBe('is-highlight');
    });

    it('57.3#13 should be is-dimmed when selected does not match', () => {
        expect(
            FeatureMap_Filter_Engine.computeChipClass(ALPHA, stateWithSelected({ layer: ['ui'] })),
        ).toBe('is-dimmed');
    });

    it('57.3#14 should AND multiple selected across different dimensions', () => {
        // ALPHA: layer=cli, family=fam-a — оба совпадают
        expect(
            FeatureMap_Filter_Engine.computeChipClass(
                ALPHA,
                stateWithSelected({ layer: ['cli'], family: ['fam-a'] }),
            ),
        ).toBe('is-highlight');

        // только один совпадает → is-dimmed
        expect(
            FeatureMap_Filter_Engine.computeChipClass(
                ALPHA,
                stateWithSelected({ layer: ['cli'], family: ['fam-b'] }),
            ),
        ).toBe('is-dimmed');
    });

    it('57.3#15 should AND multiple selected inside one dimension (GAMMA has both)', () => {
        // GAMMA.layer = [cli, ui]
        expect(
            FeatureMap_Filter_Engine.computeChipClass(
                GAMMA,
                stateWithSelected({ layer: ['cli', 'ui'] }),
            ),
        ).toBe('is-highlight');

        // ALPHA.layer = [cli] — не хватает 'ui'
        expect(
            FeatureMap_Filter_Engine.computeChipClass(
                ALPHA,
                stateWithSelected({ layer: ['cli', 'ui'] }),
            ),
        ).toBe('is-dimmed');
    });

    it('57.3#16 should be is-highlight when hover matches and selected matches', () => {
        const s = stateWithSelected({ layer: ['cli'] });
        s.hovered.family = 'fam-a';
        expect(FeatureMap_Filter_Engine.computeChipClass(ALPHA, s)).toBe('is-highlight');
    });

    it('57.3#17 should be is-preview-add when hover matches but selected does not', () => {
        // selected фильтрует layer=ui (ALPHA не проходит),
        // но hovered family=fam-a — ALPHA подходит
        const s = stateWithSelected({ layer: ['ui'] });
        s.hovered.family = 'fam-a';
        expect(FeatureMap_Filter_Engine.computeChipClass(ALPHA, s)).toBe('is-preview-add');
    });

    it('57.3#18 should be is-preview-drop when selected matches but hover does not', () => {
        const s = stateWithSelected({ layer: ['cli'] });
        s.hovered.family = 'fam-b';
        expect(FeatureMap_Filter_Engine.computeChipClass(ALPHA, s)).toBe('is-preview-drop');
    });

    it('57.3#19 should be is-dimmed when neither selected nor hover matches', () => {
        const s = stateWithSelected({ layer: ['ui'] });
        s.hovered.family = 'fam-b';
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
            FeatureMap_Filter_Engine.computeCellClass([ALPHA, BETA], stateWithSelected({ layer: ['cli'] })),
        ).toBe('is-cell-highlight');
    });

    it('57.3#22 should be is-cell-preview-add when no highlight but at least one preview-add', () => {
        const s = stateWithSelected({ layer: ['ui'] });
        s.hovered.family = 'fam-a';
        // ALPHA → is-preview-add; BETA → is-dimmed (или preview-drop)
        expect(FeatureMap_Filter_Engine.computeCellClass([ALPHA, BETA], s)).toBe('is-cell-preview-add');
    });

    it('57.3#23 should be is-dimmed when every chip is dimmed/preview-drop', () => {
        // selected layer=ui (ALPHA/BETA — ALPHA не проходит → dimmed; BETA проходит, но не hovered)
        // hover family=fam-b (ALPHA не matches → preview-drop или dimmed)
        const s = stateWithSelected({ layer: ['ui'] });
        s.hovered.family = 'fam-b';
        // ALPHA: selected=no, hover=no → is-dimmed
        // BETA:  selected=yes, hover=yes → is-highlight  ← но это только один
        // чтобы получить именно is-dimmed на ячейке, возьмём только ALPHA
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
        // layer=cli: ALPHA (cli), GAMMA (cli|ui) → 2 из 3
        const r = FeatureMap_Filter_Engine.computeVisibility(
            [ALPHA, BETA, GAMMA],
            stateWithSelected({ layer: ['cli'] }),
        );
        expect(r).toEqual({ shown: 2, total: 3, mode: 'plain', resetDisabled: false });
    });

    it('57.3#26 should count chips that match BOTH selected and hovered (AND) in preview mode', () => {
        // selected=layer:cli → ALPHA, GAMMA, DELTA
        // hovered=family:fam-b → BETA, DELTA
        // AND → {DELTA} → 1
        const s = stateWithSelected({ layer: ['cli'] });
        s.hovered.family = 'fam-b';
        const r = FeatureMap_Filter_Engine.computeVisibility(
            [ALPHA, BETA, GAMMA, DELTA],
            s,
        );
        expect(r).toEqual({ shown: 1, total: 4, mode: 'preview', resetDisabled: false });
    });

    it('57.3#27 should use only hovered when selected is empty', () => {
        // hovered=actor:ci (ALPHA, GAMMA) → 2
        const r = FeatureMap_Filter_Engine.computeVisibility(
            [ALPHA, BETA, GAMMA],
            stateWithHovered({ actor: 'ci' }),
        );
        expect(r).toEqual({ shown: 2, total: 3, mode: 'preview', resetDisabled: false });
    });
});