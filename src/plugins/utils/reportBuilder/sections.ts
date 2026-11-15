import { SECTION_LABELS, SECTION_TYPES, FILE_NAMES, FILE_EXTENSIONS } from './constants.ts';
import type { PagebuilderArticle, PagebuilderColumn } from './types.ts';

interface ParsedUrlParts {
    sectionName: string | null;
    chapterName: string | null;
    articleFolder: string | null;
}

interface RawChapter {
    name: string;
    globalNum: number | null;
}

export interface ChapterData {
    name: string;
    order?: number;
    articles: PagebuilderArticle[];
}

interface ArticleEntry {
    art: PagebuilderArticle;
    chapterName: string | null;
    articleFolder: string | null;
    isChapterArticle: boolean;
}

export interface SectionData {
    name: string | null;
    displayName: string;
    order: number | typeof Infinity;
    chapters: Map<number, ChapterData>;
    _rawChapters: RawChapter[];
    _allArticles: ArticleEntry[];
    _sectionArticles: PagebuilderArticle[];
}

export function parseUrlParts(url: string): ParsedUrlParts {
    const parts = url.split('/').filter((p) => p);
    let sectionName: string | null = null;
    let chapterName: string | null = null;
    let articleFolder: string | null = null;

    if (parts.length >= 2) {
        const candidate = parts[1]!;
        if (candidate.endsWith(FILE_EXTENSIONS.HTML) || candidate.endsWith(FILE_EXTENSIONS.MARKDOWN)) {
            articleFolder = candidate.replace(/\.[^/.]+$/, '');
        } else if (candidate.startsWith(SECTION_TYPES.CHAPTER_PREFIX)) {
            chapterName = candidate;
            if (parts.length >= 3) {
                articleFolder = parts[2]!.replace(/\.[^/.]+$/, '');
            }
        } else {
            sectionName = candidate;
            if (parts.length >= 3) {
                const inner = parts[2]!;
                if (inner.startsWith(SECTION_TYPES.CHAPTER_PREFIX)) {
                    chapterName = inner;
                    if (parts.length >= 4) {
                        articleFolder = parts[3]!.replace(/\.[^/.]+$/, '');
                    }
                } else {
                    articleFolder = inner.replace(/\.[^/.]+$/, '');
                }
            }
        }
    } else if (
        parts.length === 1 &&
        (parts[0]!.endsWith(FILE_EXTENSIONS.HTML) || parts[0]!.endsWith(FILE_EXTENSIONS.MARKDOWN))
    ) {
        articleFolder = parts[0]!.replace(/\.[^/.]+$/, '');
    }

    if (!articleFolder) {
        const last = parts[parts.length - 1] || '';
        articleFolder = last.replace(FILE_EXTENSIONS.HTML, '');
    }

    return { sectionName, chapterName, articleFolder };
}

export function getChapterNumber(chapterName: string): number | null {
    const m = chapterName.match(new RegExp(`^${SECTION_TYPES.CHAPTER_PREFIX}(\\d+)`));
    return m ? parseInt(m[1]!, 10) : null;
}

export function getSectionNumber(sectionName: string): number | null {
    const m = sectionName.match(new RegExp(`^${SECTION_TYPES.SECTION_PREFIX}(\\d+)`));
    return m ? parseInt(m[1]!, 10) : null;
}

export function buildSectionsMap(articles: PagebuilderArticle[]): Map<string, SectionData> {
    const sectionsMap = new Map<string, SectionData>();

    for (const art of articles) {
        const { sectionName, chapterName, articleFolder } = parseUrlParts(art.url);
        const sectionKey = sectionName || SECTION_LABELS.NO_SECTION;
        if (!sectionsMap.has(sectionKey)) {
            const displayName =
                art.parents && art.parents.length > 0 ? art.parents[art.parents.length - 1]! : sectionKey;
            sectionsMap.set(sectionKey, {
                name: sectionName,
                displayName,
                order: sectionName ? (getSectionNumber(sectionName) ?? Infinity) : Infinity,
                chapters: new Map(),
                _rawChapters: [],
                _allArticles: [],
                _sectionArticles: [],
            });
        }
        const sectionData = sectionsMap.get(sectionKey)!;
        const isChapterArticle =
            chapterName !== null && (articleFolder === FILE_NAMES.INDEX || articleFolder === FILE_NAMES.INDEX_HTML);
        if (chapterName) {
            sectionData._rawChapters.push({ name: chapterName, globalNum: getChapterNumber(chapterName) });
        }
        sectionData._allArticles.push({ art, chapterName, articleFolder, isChapterArticle });
    }

    return sectionsMap;
}

export function calculateChapterOrder(sectionData: SectionData): Map<number, ChapterData> {
    const chaptersMap = new Map<string, { name: string; globalNum: number | null }>();
    for (const ch of sectionData._rawChapters) {
        if (!chaptersMap.has(ch.name)) {
            chaptersMap.set(ch.name, { name: ch.name, globalNum: ch.globalNum });
        }
    }
    const sorted = Array.from(chaptersMap.values()).sort((a, b) => {
        if (a.globalNum === null && b.globalNum === null) return a.name.localeCompare(b.name);
        if (a.globalNum === null) return 1;
        if (b.globalNum === null) return -1;
        return a.globalNum - b.globalNum;
    });

    const chapters = new Map<number, ChapterData>();
    sorted.forEach((ch, idx) => {
        chapters.set(idx + 1, { name: ch.name, articles: [] });
    });
    return chapters;
}

export function distributeArticles(sectionData: SectionData): void {
    const chapters = sectionData.chapters;
    const noChapterArticles: PagebuilderArticle[] = [];
    for (const entry of sectionData._allArticles) {
        const chName = entry.chapterName;
        if (chName) {
            let found = false;
            for (const [, chData] of chapters) {
                if (chData.name === chName) {
                    chData.articles.push({ ...entry.art, isChapterArticle: entry.isChapterArticle });
                    found = true;
                    break;
                }
            }
            if (!found) {
                noChapterArticles.push({ ...entry.art, isChapterArticle: false });
            }
        } else {
            const isSectionArticle =
                (entry.articleFolder === FILE_NAMES.INDEX || entry.articleFolder === FILE_NAMES.INDEX_HTML) &&
                sectionData.name !== null;
            if (isSectionArticle) {
                sectionData._sectionArticles.push({ ...entry.art, isChapterArticle: false });
            } else {
                noChapterArticles.push({ ...entry.art, isChapterArticle: false });
            }
        }
    }
    const maxOrder = Math.max(0, ...chapters.keys());
    chapters.set(maxOrder + 1, { name: SECTION_LABELS.NO_CHAPTER, articles: noChapterArticles });
}

export function buildMatrixFromSections(sectionsMap: Map<string, SectionData>): {
    matrix: PagebuilderArticle[][][];
    rows: string[];
    cols: PagebuilderColumn[];
} {
    let maxChapters = 0;
    for (const [, sectionData] of sectionsMap) {
        if (sectionData.chapters.size > maxChapters) maxChapters = sectionData.chapters.size;
    }

    const sortedSections = Array.from(sectionsMap.keys()).sort((a, b) => {
        const aOrder = sectionsMap.get(a)!.order;
        const bOrder = sectionsMap.get(b)!.order;
        if (aOrder === Infinity && bOrder === Infinity) return a.localeCompare(b);
        if (aOrder === Infinity) return 1;
        if (bOrder === Infinity) return -1;
        return aOrder - bOrder;
    });

    const cols: PagebuilderColumn[] = sortedSections.map((key) => ({
        key,
        displayName: sectionsMap.get(key)!.displayName,
    }));

    const matrix: PagebuilderArticle[][][] = [];

    const sectionRow: PagebuilderArticle[][] = [];
    for (const sectionKey of sortedSections) {
        sectionRow.push(sectionsMap.get(sectionKey)!._sectionArticles);
    }
    matrix.push(sectionRow);

    for (let row = 1; row <= maxChapters; row++) {
        const rowData: PagebuilderArticle[][] = [];
        for (const sectionKey of sortedSections) {
            const sectionData = sectionsMap.get(sectionKey)!;
            let articles: PagebuilderArticle[] = [];
            for (const [order, chData] of sectionData.chapters) {
                if (order === row && chData.name !== SECTION_LABELS.NO_CHAPTER) {
                    articles = chData.articles;
                    break;
                }
            }
            rowData.push(articles);
        }
        matrix.push(rowData);
    }

    const extraRow: PagebuilderArticle[][] = [];
    for (const sectionKey of sortedSections) {
        const sectionData = sectionsMap.get(sectionKey)!;
        let noChapterArticles: PagebuilderArticle[] = [];
        for (const [, chData] of sectionData.chapters) {
            if (chData.name === SECTION_LABELS.NO_CHAPTER) {
                noChapterArticles = chData.articles;
                break;
            }
        }
        extraRow.push(noChapterArticles);
    }
    matrix.push(extraRow);

    const rowLabels: string[] = [SECTION_LABELS.SECTION_CONTENT];

    const safeMaxChapters = Math.max(1, Number(maxChapters) || 1);
    const leadingLength = String(safeMaxChapters).length;
    for (let i = 1; i <= safeMaxChapters; i++) {
        rowLabels.push(String(i).padStart(leadingLength, '0'));
    }
    rowLabels.push(SECTION_LABELS.OTHER);

    const filteredMatrix: PagebuilderArticle[][][] = [];
    const filteredRowLabels: string[] = [];
    for (let r = 0; r < matrix.length; r++) {
        const row = matrix[r]!;
        if (row.some((cell) => cell.length > 0)) {
            filteredMatrix.push(row);
            filteredRowLabels.push(rowLabels[r]!);
        }
    }
    return { matrix: filteredMatrix, rows: filteredRowLabels, cols };
}