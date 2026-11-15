import { ARTICLE_STATUS, STATUS_THRESHOLDS } from './constants.ts';
import type { ArticleStatus } from './constants.ts';

export function getArticleStatus(size: number, avg: number): ArticleStatus {
    if (size < STATUS_THRESHOLDS.MIN_SIZE) return ARTICLE_STATUS.EMPTY;
    const ratio = avg ? size / avg : 0;
    if (ratio > STATUS_THRESHOLDS.EXCESS_RATIO) return ARTICLE_STATUS.EXCESS;
    if (ratio >= STATUS_THRESHOLDS.FULL_RATIO) return ARTICLE_STATUS.FULL;
    if (ratio >= STATUS_THRESHOLDS.PARTIAL_RATIO) return ARTICLE_STATUS.PARTIAL;
    return ARTICLE_STATUS.MINIMUM;
}