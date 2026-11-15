import { findDefaultAssetsDir } from '../utils/reportBuilder/assets-path.ts';
import { buildMatrix } from '../utils/reportBuilder/matrix.ts';
import { generateGenericTableFromArticles } from '../utils/reportBuilder/pageBuilder.ts';
import type {
    PagebuilderArticle,
    PagebuilderLegendItem,
    PagebuilderMatrixData,
} from '../utils/reportBuilder/types.ts';

const LEGEND_ITEMS: PagebuilderLegendItem[] = [
    { color: 'color-excess', description: 'Избыток (&gt;120% от среднего)' },
    { color: 'color-full', description: 'Заполнена (≥80% от среднего)' },
    { color: 'color-partial', description: 'Частично (50–80%)' },
    { color: 'color-minimum', description: 'Минимально (≥490 байт, &lt;50%)' },
    { color: 'color-empty', description: 'Пустая (&lt;490 байт)' },
    { color: 'chapter-article', description: 'Текст главы' },
];

export interface GenerateBytesCounterPageOptions {
    mapDir: string;
    outputDir: string;
    lang?: string | string[];
    /** Переопределить каталог ассетов отчёта (по умолчанию — `./assets` рядом с этим файлом). */
    assetsDir?: string;
    /** Переопределить общий каталог ассетов. По умолчанию — `reportBuilder/assets`. */
    sharedAssetsDir?: string;
    /** Имя входного JSON. По умолчанию — `app-help-contents.json`. */
    inputJsonName?: string;
}

export function buildSizeMatrix(jsonData: PagebuilderArticle[], lang: string): PagebuilderMatrixData {
    return buildMatrix(jsonData, lang);
}

export function generateBytesCounterPage(opts: GenerateBytesCounterPageOptions): void {
    const navLinks = [
        { label: 'Контексты', url: 'contextmap.html' },
        { label: 'Хелптаги', url: 'helptagmap.html' },
    ];
    generateGenericTableFromArticles({
        mapDir: opts.mapDir,
        outputDir: opts.outputDir,
        lang: opts.lang ?? 'ru',
        htmlFileName: 'bytescounter.html',
        cssFileName: 'bytescounter.css',
        jsFileName: 'bytescounter.js',
        dataFileName: 'bytescounter.data.js',
        title: 'Распределение размера статей по разделам и главам',
        legendItems: LEGEND_ITEMS,
        matrixBuilder: buildSizeMatrix,
        navLinks,
        inputJsonName: opts.inputJsonName,
        assetsDir: opts.assetsDir ?? findDefaultAssetsDir('reportPeriodicTable'),
        sharedAssetsDir: opts.sharedAssetsDir,
    });
}