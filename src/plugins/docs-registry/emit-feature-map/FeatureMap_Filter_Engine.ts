/**
 * Чистая логика фильтрации Feature Map.
 *
 * Историческое имя: inline-функции `attrsOf` / `needs` / `chipMatches` /
 * `anyActive` + inline-логика `render` / `updateCounter` в
 * `feature-map.client.js` (browser IIFE).
 *
 * ⚠️ Статус: **reference implementation**. Пока `feature-map.client.js`
 * остаётся браузерным IIFE (без бандлера), его inline-функции дублируют
 * эту логику. Полная унификация — шаг 3 (client.js → client.ts + esbuild).
 *
 * ⚠️ Цель: характеризационные тесты `57.3#01..#25` фиксируют текущее
 * поведение. Любое расхождение = изменение визуального поведения
 * фильтрации; должно быть явным решением, а не побочным эффектом
 * рефакторинга.
 *
 * Соглашения:
 *   - `RawAttrs.cap` — потому что в HTML атрибут `data-cap` (не `data-capability`);
 *     во внутреннем `ChipAttrs` — `capability` (полное имя измерения).
 *   - `computeChipClass` / `computeCellClass` возвращают **один класс** или `null`,
 *     а не массив, — совпадает с тем, что `element.classList.add()` принимает
 *     один аргумент (в старой логике тоже ровно один класс на чип/ячейку).
 */

export type StripKey = 'actor' | 'capability' | 'layer' | 'family';

export const STRIP_KEYS: readonly StripKey[] = ['actor', 'capability', 'layer', 'family'];

export interface FilterState {
    selected: Record<StripKey, ReadonlySet<string>>;
    hovered: Record<StripKey, string | null>;
}

/** Сырые значения data-атрибутов DOM-элемента (см. `chip.dataset`). */
export interface RawAttrs {
    actor?: string;
    cap?: string;       // ← data-cap, не data-capability
    layer?: string;
    family?: string;
}

/** Разобранные атрибуты чипа. */
export interface ChipAttrs {
    actor: string[];
    capability: string[];
    layer: string[];
    family: string[];
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
    /** 'plain' — статичный счётчик «Показано: N из M»; 'preview' — «Будет показано: …». */
    mode: 'plain' | 'preview';
    /** `true` — нет активных фильтров, reset-button должен быть disabled. */
    resetDisabled: boolean;
}

export class FeatureMap_Filter_Engine {
    /** Парсит `dataset`-поля чипа. Пустая строка / undefined → `[]`. */
    static attrsOf(raw: RawAttrs): ChipAttrs {
        const split = (v: string | undefined): string[] =>
            (v ?? '').split(/\s+/).filter(Boolean);
        return {
            actor: split(raw.actor),
            capability: split(raw.cap),
            layer: split(raw.layer),
            family: split(raw.family),
        };
    }

    /**
     * Значения, которые нужны для измерения `key`:
     * `selected[key] ∪ {hovered[key]}`.
     * Возвращает новый Set (мутация не затрагивает `state`).
     */
    static needs(state: FilterState, key: StripKey): Set<string> {
        const result = new Set(state.selected[key]);
        const hovered = state.hovered[key];
        if (hovered) result.add(hovered);
        return result;
    }

    /** Есть ли хоть один selected-элемент или hovered-элемент во всём state. */
    static anyActive(state: FilterState): boolean {
        for (const k of STRIP_KEYS) {
            if (state.selected[k].size || state.hovered[k]) return true;
        }
        return false;
    }

    /**
     * CSS-класс для чипа модуля (или `null`, если фильтры неактивны).
     *
     * Соответствует inline-логике из `feature-map.client.js#render`:
     *   - `!active` → `null`;
     *   - `active && !hasHovered` → `is-highlight` (mSel) / `is-dimmed` (!mSel);
     *   - `active && hasHovered`:
     *       `mSel && mHov` → `is-highlight`,
     *       `!mSel && mHov` → `is-preview-add`,
     *       `mSel && !mHov` → `is-preview-drop`,
     *       else → `is-dimmed`.
     */
    static computeChipClass(attrs: ChipAttrs, state: FilterState): ChipHighlightClass {
        if (!FeatureMap_Filter_Engine.anyActive(state)) return null;

        const hasHovered = STRIP_KEYS.some(k => state.hovered[k] !== null);
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

    /**
     * CSS-класс для ячейки сетки (`td`).
     *
     * Соответствует inline-логике из `feature-map.client.js#render`:
     *   - `!active` → `null`;
     *   - если есть хоть один `is-highlight`-чип → `is-cell-highlight`;
     *   - иначе если есть `is-preview-add` → `is-cell-preview-add`;
     *   - иначе → `is-dimmed`.
     */
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

    /**
     * Счётчик для тулбара.
     *
     * Соответствует inline-логике из `feature-map.client.js#updateCounter`:
     *   - `!active` → `{ shown: total, mode: 'plain', resetDisabled: true }`;
     *   - `active && !hasHovered` → `{ shown: |{mSel}|, mode: 'plain', resetDisabled: false }`;
     *   - `active && hasHovered` → `{ shown: |{mSel ∧ mHov}|, mode: 'preview', resetDisabled: false }`.
     */
    static computeVisibility(moduleChips: ChipAttrs[], state: FilterState): VisibilityResult {
        const total = moduleChips.length;
        if (!FeatureMap_Filter_Engine.anyActive(state)) {
            return { shown: total, total, mode: 'plain', resetDisabled: true };
        }

        const hasHovered = STRIP_KEYS.some(k => state.hovered[k] !== null);
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

    /** true, если чип удовлетворяет **всем** selected-измерениям (AND). */
    private static _matchesSelected(attrs: ChipAttrs, state: FilterState): boolean {
        for (const k of STRIP_KEYS) {
            const sel = state.selected[k];
            if (!sel.size) continue;
            for (const x of sel) {
                if (attrs[k].indexOf(x) < 0) return false;
            }
        }
        return true;
    }

    /** true, если чип удовлетворяет **всем** hovered-измерениям (AND). */
    private static _matchesHovered(attrs: ChipAttrs, state: FilterState): boolean {
        for (const k of STRIP_KEYS) {
            const hov = state.hovered[k];
            if (!hov) continue;
            if (attrs[k].indexOf(hov) < 0) return false;
        }
        return true;
    }
}