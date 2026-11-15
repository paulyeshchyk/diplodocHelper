// Ambient-типы для браузерных скриптов из assets/.
// Не собираются, не эмитятся — только для IDE-подсказок и tsc --noEmit
// (если когда-нибудь снимете `**/assets/**` из tsconfig.exclude).

interface PagebuilderArticle {
    title: string;
    url: string;
    size: number;
    status: string;
    context?: string;
    helptag?: string;
    isChapterArticle?: boolean;
    [key: string]: unknown;
}

interface PagebuilderColumn {
    key: string;
    displayName: string;
}

interface PagebuilderMatrixData {
    matrix: PagebuilderArticle[][][];
    rows: string[];
    cols: PagebuilderColumn[];
    totalArticles: number;
    totalSize: number;
    avgSize?: number;
}

interface PagebuilderLegendItem {
    color: string;
    description: string;
}

interface PagebuilderNavLink {
    label: string;
    url: string;
}

interface PagebuilderI18n {
    noData: string;
    noArticles: string;
    chapterHeader: string;
    langLabel: string;
    totalArticlesLabel: string;
    totalSizeLabel: string;
    avgSizeLabel: string;
    bytes: string;
}

interface PagebuilderConfig {
    colorMap: Record<string, string>;
    getTitle(art: PagebuilderArticle, t: PagebuilderI18n): string;
    getStatsHTML(lang: string, matrixData: PagebuilderMatrixData, t: PagebuilderI18n): string;
}

/** Формат `<name>.data.js` — генерируется на сервере. */
interface PagebuilderData {
    matrixData: Record<string, PagebuilderMatrixData>;
    legendItems: PagebuilderLegendItem[];
    navLinks: PagebuilderNavLink[];
}

/** Глобал из `<name>.data.js`. */
declare const periodicData: PagebuilderData;

/** Глобал из `core-renderer.js` — точка входа для конфиг-скриптов. */
declare function initApp(
    matrixDataMap: Record<string, PagebuilderMatrixData>,
    navLinks: PagebuilderNavLink[],
    config: PagebuilderConfig,
): void;