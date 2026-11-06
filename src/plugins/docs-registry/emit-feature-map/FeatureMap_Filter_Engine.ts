export type ChipAttrs = Record<string, string[]>;

export interface FilterState {
    selected: Record<string, ReadonlySet<string>>;
    hovered: Record<string, string | null>;
}

/**
 * Сырые значения data-атрибутов DOM-элемента.
 *
 * Phase B: приоритет — `attrs` (уже распарсенный `data-attrs` JSON).
 * `actor` / `cap` / `layer` / `family` — legacy Phase A (back-compat
 * на время, пока сгенерированный HTML ещё содержит individual-атрибуты;
 * удаляется в Phase C).
 */
export interface RawAttrs {
    /** Phase B: `data-attrs` JSON, распарсенный вызывающим. */
    attrs?: Record<string, string[]>;
    /** Legacy Phase A: individual `data-*`. */
    actor?: string;
    cap?: string;
    layer?: string;
    family?: string;
}

export type ChipHighlightClass =
    | 'is-highlight'
    | 'is-preview-add'
    | 'is-preview-drop'
    | 'is-dimmed'
    | null;

export type CellHighlightClass =
    | 'is-cell-highlight'
    | 'is-cell-preview-add'
    | 'is-dimmed'
    | null;

export interface VisibilityResult {
    shown: number;
    total: number;
    mode: 'plain' | 'preview';
    resetDisabled: boolean;
}

export class FeatureMap_Filter_Engine {
    /**
     * Парсит сырые значения data-атрибутов в `ChipAttrs`.
     *
     * Phase B: если `raw.attrs` задан — используется он (JSON из `data-attrs`).
     * Иначе — legacy fallback на individual `data-actor` / `data-cap` /
     * `data-layer` / `data-family`.
     *
     * Возвращает только те ключи, для которых есть значения (в Phase B);
     * в legacy-fallback — все 4 legacy-ключа как массивы (даже пустые),
     * как было в Phase A.
     */
    static attrsOf(raw: RawAttrs): ChipAttrs {
        const out: ChipAttrs = {};

        if (raw.attrs) {
            for (const [k, v] of Object.entries(raw.attrs)) {
                out[k] = Array.isArray(v) ? v.map(String) : [];
            }
            return out;
        }

        // Legacy fallback (Phase A back-compat).
        const legacy: Record<string, string | undefined> = {
            actor: raw.actor,
            capability: raw.cap,
            layer: raw.layer,
            family: raw.family,
        };
        for (const [k, v] of Object.entries(legacy)) {
            out[k] = (v ?? '').split(/\s+/).filter(Boolean);
        }
        return out;
    }

    /** `selected[key] ∪ {hovered[key]}`, новый Set. */
    static needs(state: FilterState, key: string): Set<string> {
        const result = new Set<string>(state.selected[key] ?? []);
        const hovered = state.hovered[key];
        if (hovered) result.add(hovered);
        return result;
    }

    /** Есть ли хоть один selected-элемент или hovered-элемент во всём state. */
    static anyActive(state: FilterState): boolean {
        for (const k of Object.keys(state.selected)) {
            if (state.selected[k].size) return true;
        }
        for (const k of Object.keys(state.hovered)) {
            if (state.hovered[k]) return true;
        }
        return false;
    }

    /** CSS-класс для чипа модуля (или `null`, если фильтры неактивны). */
    static computeChipClass(attrs: ChipAttrs, state: FilterState): ChipHighlightClass {
        if (!FeatureMap_Filter_Engine.anyActive(state)) return null;

        const hasHovered = Object.keys(state.hovered).some(k => state.hovered[k] !== null);
        const mSel = FeatureMap_Filter_Engine._matchesSelected(attrs, state);
        const mHov = FeatureMap_Filter_Engine._matchesHovered(attrs, state);

        if (hasHovered) {
            if (mSel && mHov) return 'is-highlight';
            if (!mSel && mHov) return 'is-preview-add';
            if (mSel && !mHov) return 'is-preview-drop';
            return 'is-dimmed';
        }
        return mSel ? 'is-highlight' : 'is-dimmed';
    }

    /** CSS-класс для ячейки сетки (`td`). */
    static computeCellClass(chips: ChipAttrs[], state: FilterState): CellHighlightClass {
        if (!FeatureMap_Filter_Engine.anyActive(state)) return null;

        let hasHighlight = false;
        let hasPreviewAdd = false;
        for (const attrs of chips) {
            const cls = FeatureMap_Filter_Engine.computeChipClass(attrs, state);
            if (cls === 'is-highlight') hasHighlight = true;
            else if (cls === 'is-preview-add') hasPreviewAdd = true;
        }
        if (hasHighlight) return 'is-cell-highlight';
        if (hasPreviewAdd) return 'is-cell-preview-add';
        return 'is-dimmed';
    }

    /** Счётчик для тулбара. */
    static computeVisibility(moduleChips: ChipAttrs[], state: FilterState): VisibilityResult {
        const total = moduleChips.length;
        if (!FeatureMap_Filter_Engine.anyActive(state)) {
            return { shown: total, total, mode: 'plain', resetDisabled: true };
        }

        const hasHovered = Object.keys(state.hovered).some(k => state.hovered[k] !== null);
        let shown = 0;
        for (const attrs of moduleChips) {
            const mSel = FeatureMap_Filter_Engine._matchesSelected(attrs, state);
            const mHov = FeatureMap_Filter_Engine._matchesHovered(attrs, state);
            if (hasHovered) {
                if (mSel && mHov) shown++;
            } else if (mSel) {
                shown++;
            }
        }
        return {
            shown,
            total,
            mode: hasHovered ? 'preview' : 'plain',
            resetDisabled: false,
        };
    }

    // --- private ---------------------------------------------------------

    private static _matchesSelected(attrs: ChipAttrs, state: FilterState): boolean {
        for (const k of Object.keys(state.selected)) {
            const sel = state.selected[k];
            if (!sel.size) continue;
            const have = attrs[k] ?? [];
            for (const x of sel) {
                if (have.indexOf(x) < 0) return false;
            }
        }
        return true;
    }

    private static _matchesHovered(attrs: ChipAttrs, state: FilterState): boolean {
        for (const k of Object.keys(state.hovered)) {
            const hov = state.hovered[k];
            if (!hov) continue;
            const have = attrs[k] ?? [];
            if (have.indexOf(hov) < 0) return false;
        }
        return true;
    }
}