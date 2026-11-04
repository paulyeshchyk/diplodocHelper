/**
 * Типы модуля `terms`.
 *
 * Симметричны `abbrs.types.ts`; отличаются только именем поля-ключа
 * (`term` вместо `abbr`) и поля-определения (`definition` вместо `full`).
 * Раздельные файлы — намеренно: `abbrs` и `terms` эволюционируют
 * независимо (см. их словари и injector'ы).
 */

/** Одно вхождение термина в конкретный `.md`-файл. */
export interface TermPage {
    title: string;
    href: string;
    occurrences: number;
}

/** Агрегированная запись по термину (см. `AbbrEntry` для семантики). */
export interface TermEntry {
    term: string;
    definition: string;
    category?: string;
    description?: string;
    definedInDictionary: boolean;
    rank: number;
    totalOccurrences: number;
    pages: TermPage[];
}

/**
 * Результат `walkMdFilesGetTerms`: ключ — `TermEntry.term`.
 */
export type TermMap = Record<string, TermEntry>;