import { findDefaultAssetsDir } from '../utils/reportBuilder/assets-path.ts';
import { buildMatrix } from '../utils/reportBuilder/matrix.ts';
import { generateGenericTableFromArticles } from '../utils/reportBuilder/pageBuilder.ts';
import type {
    PagebuilderArticle,
    PagebuilderLegendItem,
    PagebuilderMatrixData,
    PagebuilderNavLink,
} from '../utils/reportBuilder/types.ts';



export interface HelptagStatusInfo {
    status: string;
    label: string;
}

export function getHelptagStatus(art: PagebuilderArticle): HelptagStatusInfo {
    const hasHelptag = art.helptag && art.helptag.trim() !== '';
    const count = hasHelptag ? 1 : 0;
    if (count === 0) return { status: 'empty', label: 'Нет helptag' };
    if (count === 1) return { status: 'normal', label: 'Один helptag' };
    return { status: 'excess', label: '>1 helptag' };
}

export function buildHelptagMatrix(jsonData: PagebuilderArticle[], lang: string): PagebuilderMatrixData {
    const matrixData = buildMatrix(jsonData, lang);
    const newMatrix = matrixData.matrix.map((row) =>
        row.map((cell) =>
            cell.map((art) => {
                const statusInfo = getHelptagStatus(art);
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
    { color: 'color-excess', description: '&gt;1 helptag' },
    { color: 'color-normal', description: 'Один helptag' },
    { color: 'color-empty', description: 'Нет helptag (0)' },
    { color: 'chapter-article', description: 'Текст главы' },
];

const NAV_LINKS: PagebuilderNavLink[] = [
    { label: 'Размеры', url: 'bytescounter.html' },
    { label: 'Контексты', url: 'contextmap.html' },
];

export interface GenerateHelpTagPageOptions {
    mapDir: string;
    outputDir: string;
    lang?: string | string[];
    assetsDir?: string;
    sharedAssetsDir?: string;
    inputJsonName?: string;
}

export function generateHelpTagPage(opts: GenerateHelpTagPageOptions): void {
    generateGenericTableFromArticles({
        mapDir: opts.mapDir,
        outputDir: opts.outputDir,
        lang: opts.lang ?? 'ru',
        htmlFileName: 'helptagmap.html',
        cssFileName: 'helptagmap.css',
        jsFileName: 'helptagmap.js',
        dataFileName: 'helptagmap.data.js',
        title: 'Распределение helptag по разделам и главам',
        legendItems: LEGEND_ITEMS,
        matrixBuilder: buildHelptagMatrix,
        navLinks: NAV_LINKS,
        inputJsonName: opts.inputJsonName,
        assetsDir: opts.assetsDir ?? findDefaultAssetsDir('reportPeriodicTableHelpTag'),
        sharedAssetsDir: opts.sharedAssetsDir,
    });
}