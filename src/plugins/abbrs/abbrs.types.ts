/**
 * Типы модуля `abbrs`.
 *
 * Отделены от реализации, чтобы:
 *   - TS-тесты и TS-потребители импортировали их через `import type`;
 *   - JSDoc в `*.js` ссылался на единый источник
 *     (`import('./abbrs.types.ts').AbbrMap`).
 *
 * Структура совпадает с той, что исторически собирает
 * `walkMdFilesGetAbbrs` в `abbrs.collector.js`.
 */

/** Одно вхождение аббревиатуры в конкретный `.md`-файл. */
export interface AbbrPage {
    title: string;
    href: string;
    occurrences: number;
}

/**
 * Агрегированная запись по аббревиатуре.
 *
 * `definedInDictionary`:
 *   - `true`  — запись инициализирована из `abbreviations.yaml`;
 *   - `false` — аббревиатура встретилась в тексте, но не описана в словаре.
 */
export interface AbbrEntry {
    abbr: string;
    full: string;
    category?: string;
    description?: string;
    definedInDictionary: boolean;
    /** Количество страниц, на которых встретилась аббревиатура. */
    rank: number;
    /** Суммарное число вхождений по всем страницам. */
    totalOccurrences: number;
    pages: AbbrPage[];
}

/**
 * Результат `walkMdFilesGetAbbrs`: ключ — `AbbrEntry.abbr`.
 *
 * Все записи из словаря гарантированно присутствуют (даже без вхождений),
 * поэтому `map[abbr]` в потребителях определён для любого ключа словаря.
 * Для аббревиатур вне словаря ключ появляется только при первом вхождении.
 */
export type AbbrMap = Record<string, AbbrEntry>;