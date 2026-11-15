import { STATUS_THRESHOLDS } from './constants.ts';
import type { PagebuilderArticle, PagebuilderMatrixData } from './types.ts';
import { getArticleStatus } from './status.ts';
import {
    buildSectionsMap,
    calculateChapterOrder,
    distributeArticles,
    buildMatrixFromSections,
} from './sections.ts';

export function percentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) return 0;
    const idx = (sortedArr.length - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sortedArr[lower]!;
    return sortedArr[lower]! + (sortedArr[upper]! - sortedArr[lower]!) * (idx - lower);
}

export function computeRobustAverage(sizes: number[]): number {
    if (sizes.length === 0) return 0;
    if (sizes.length < 5) {
        return sizes.reduce((a, b) => a + b, 0) / sizes.length;
    }
    const sorted = [...sizes].sort((a, b) => a - b);
    const q1 = percentile(sorted, 0.25);
    const q3 = percentile(sorted, 0.75);
    const iqr = q3 - q1;
    const upperFence = q3 + 1.5 * iqr;
    const inliers = sorted.filter((s) => s <= upperFence);
    return inliers.reduce((a, b) => a + b, 0) / inliers.length;
}

export function buildMatrix(data: PagebuilderArticle[], lang: string): PagebuilderMatrixData {
    const filtered = data.filter((item) => item.lang === lang && item.title && item.title.trim() !== '');

    const nonEmptySizes = filtered.map((item) => item.size || 0).filter((size) => size >= STATUS_THRESHOLDS.MIN_SIZE);
    const avg = computeRobustAverage(nonEmptySizes);

    const articles: PagebuilderArticle[] = filtered.map((item) => {
        const size = item.size || 0;
        return { ...item, size, status: getArticleStatus(size, avg) };
    });

    const totalSize = articles.reduce((sum, a) => sum + (a.size || 0), 0);

    const sectionsMap = buildSectionsMap(articles);
    for (const [, sectionData] of sectionsMap) {
        sectionData.chapters = calculateChapterOrder(sectionData);
        distributeArticles(sectionData);
    }

    const { matrix, rows, cols } = buildMatrixFromSections(sectionsMap);
    return { matrix, rows, cols, avgSize: avg, totalSize, totalArticles: articles.length };
}