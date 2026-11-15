import { findDefaultAssetsDir } from '../utils/reportBuilder/assets-path.ts';
import { buildMatrix } from '../utils/reportBuilder/matrix.ts';
import { generateGenericTableFromArticles } from '../utils/reportBuilder/pageBuilder.ts';
import type {
    PagebuilderArticle,
    PagebuilderLegendItem,
    PagebuilderMatrixData,
    PagebuilderNavLink,
} from '../utils/reportBuilder/types.ts';


export interface ContextStatusInfo {
    status: string;
    label: string;
}

const CONTEXTS_SPLITTER = ',';

export function getContextStatus(art: PagebuilderArticle): ContextStatusInfo {
    const context = art.context || '';
    const parts = context
        .split(CONTEXTS_SPLITTER)
        .map((s) => s.trim())
        .filter((s) => s !== '');
    const count = parts.length;
    if (count === 0) return { status: 'empty', label: 'Нет context' };
    if (count <= 3) return { status: 'low', label: 'Мало (1–3)' };
    if (count <= 6) return { status: 'normal', label: 'Норма (4–6)' };
    return { status: 'excess', label: 'Избыток (>6)' };
}

export function buildContextMatrix(jsonData: PagebuilderArticle[], lang: string): PagebuilderMatrixData {
    const matrixData = buildMatrix(jsonData, lang);
    const newMatrix = matrixData.matrix.map((row) =>
        row.map((cell) =>
            cell.map((art) => {
                const statusInfo = getContextStatus(art);
                return { ...art, status: statusInfo.status };
            })
        )
    );
    return {
        matrix: newMatrix,
        rows: matrixData.rows,
        cols: matrixData.cols,
        totalArticles: matrixData.totalArticles,
        totalSize: matrixData.totalSize
    };
}

const LEGEND_ITEMS: PagebuilderLegendItem[] = [
    { color: 'color-excess', description: 'Избыток (>6)' },
    { color: 'color-normal', description: 'Норма (4–6)' },
    { color: 'color-low', description: 'Мало (1–3)' },
    { color: 'color-empty', description: 'Нет context (0)' },
    { color: 'chapter-article', description: 'Текст главы' },
];

const NAV_LINKS: PagebuilderNavLink[] = [
    { label: 'Хэлптэги', url: 'helptagmap.html' },
    { label: 'Размеры', url: 'bytescounter.html' },
];

export interface GenerateContextsPageOptions {
    mapDir: string;
    outputDir: string;
    lang?: string | string[];
    assetsDir?: string;
    sharedAssetsDir?: string;
    inputJsonName?: string;
}

export function generateContextsPage(opts: GenerateContextsPageOptions): void {
    generateGenericTableFromArticles({
        mapDir: opts.mapDir,
        outputDir: opts.outputDir,
        lang: opts.lang ?? 'ru',
        htmlFileName: 'contextmap.html',
        cssFileName: 'contextmap.css',
        jsFileName: 'contextmap.js',
        dataFileName: 'contextmap.data.js',
        title: 'Распределение context по разделам и главам',
        legendItems: LEGEND_ITEMS,
        matrixBuilder: buildContextMatrix,
        navLinks: NAV_LINKS,
        inputJsonName: opts.inputJsonName,
        assetsDir: opts.assetsDir ?? findDefaultAssetsDir('reportPeriodicTableContext'),
        sharedAssetsDir: opts.sharedAssetsDir,
    });
}