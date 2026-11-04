/**
 * Типы модуля `contexts` (не путать с `contentNavigator/Pagebuilder.Config.ContextMap`).
 *
 * Покрывает артефакты, которые собирает `сontexts.collector.js`
 * из frontmatter `context:` по `.md`-файлам.
 */

/** Одна страница, где встретился context-тег. */
export interface ContextPage {
    title: string;
    href: string;
    /** Размер тела `.md` (без frontmatter), в байтах. */
    size: number;
}

/**
 * Агрегированная запись по context-тегу.
 *
 * `density` — производное: `rank / (totalSize / 1024)`; используется
 * в `modules/map.js` для раскраски карты.
 */
export interface ContextEntry {
    rank: number;
    totalSize: number;
    avgSize: number;
    density: number;
    pages: ContextPage[];
}

/**
 * Результат `walkMdFilesGetContexts`: ключ — context-строка в нижнем регистре.
 */
export type ContextMap = Record<string, ContextEntry>;

/**
 * Результат `buildAllContexts`: ключ — код языка (`'ru'` / `'en'`).
 */
export type ContextMapByLang = Record<string, ContextMap>;