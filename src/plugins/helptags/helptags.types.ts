/**
 * Типы модуля `helptags`.
 *
 * `helptags.collector.js` строит карту `helptag:`-значений из frontmatter.
 * Ни `contexts`, ни `figures` в эту карту не входят — они живут
 * в собственных коллекторах.
 */

/** Одна страница, на которой присутствует helptag. */
export interface HelptagPage {
    /**
     * Отображаемый путь: `relativePath` без `/index.md` в конце
     * (по legacy-контракту `extractHelptagTagValue`).
     */
    title: string;
    /** Относительный путь от `langDir`, с прямыми слэшами, включая `.md`. */
    href: string;
}

/**
 * Агрегированная запись по одному helptag-значению.
 *
 * `rank` — количество страниц, где тег встретился (уникальных по `href`).
 */
export interface HelptagEntry {
    rank: number;
    pages: HelptagPage[];
}

/**
 * Результат `walkMdFilesGetHelptags`: ключ — helptag-строка в нижнем регистре.
 */
export type HelptagMap = Record<string, HelptagEntry>;