/**
 * Типы модуля `gosts`.
 *
 * Отделены от реализации, чтобы:
 *   - TS-тесты и TS-потребители могли импортировать их через `import type`;
 *   - JSDoc-аннотации в `*.js` ссылались на единый источник
 *     (`import('./gosts.types.ts').GostRefs`).
 */

/** Запись, как её возвращает `loadGostDictionary` (без вычисленного `anchorId`). */
export interface GostDictionaryEntry {
    code: string;
    type?: string;
    title?: string;
    date?: string;
    status?: string;
    description?: string;
}

/**
 * Запись после нормализации в `gosts.injector`: `anchorId` уже вычислен из
 * `code` через `slugify_latin_alphanumeric` → `gost-<slug>`.
 */
export interface GostEntryWithAnchor extends GostDictionaryEntry {
    anchorId: string;
}

/** Одно вхождение ГОСТа в конкретный `.md`-файл. */
export interface GostRef {
    title: string;
    href: string;
    occurrences: number;
}

/**
 * Результат `collectGostReferences`:
 *   ключ — `GostEntryWithAnchor.anchorId`;
 *   значение — массив вхождений по файлам.
 *
 * Все ключи из `gostsList` гарантированно присутствуют (даже если массив пуст),
 * поэтому `refs[anchorId]` в потребителях всегда определён.
 */
export type GostRefs = Record<string, GostRef[]>;