/**
 * Типы модуля `figures`.
 *
 * `figures.collector.js` возвращает **массив**, а не map
 * (рисунки не агрегируются по id — каждый рисунок уникален парой
 * `sourcePath` + `id`).
 *
 * `thumbPath` заполняется позже, в `figures.js` → `processThumbnails()`,
 * и только для локальных изображений (не для http/data/`//`).
 */

/** Один рисунок, извлечённый из `.md`-файла. */
export interface Figure {
    /** `id` из `<figcaption class="imageDescription" id="...">`. */
    id: string;
    /** Текст из `<figcaption>…</figcaption>` без HTML-тегов, trim. */
    caption: string;
    /**
     * Markdown-путь из `![alt](path)` **до** ближайшего `<figcaption>`
     * на той же странице (`null`, если `![…](…)` не найден).
     */
    imagePath: string | null;
    /** `alt`-текст из markdown-картинки (`caption`, если картинки нет). */
    imageAlt: string;
    /** Относительный путь `.md`-файла от `langDir`, с прямыми слэшами. */
    sourcePath: string;
    /**
     * Номер из подписи (`Рисунок 152`, `Figure 3`, `Fig. 12`) — `null`,
     * если шаблон не распознан.
     */
    figureNumber: number | null;
    /** Проставляется в `processThumbnails`, если удалось создать превью. */
    thumbPath?: string;
}

/** Результат `walkMdFilesGetFigures`: плоский список. */
export type FigureList = Figure[];