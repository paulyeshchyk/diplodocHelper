export interface PagebuilderArticle {
    title: string;
    url: string;
    lang: string;
    size: number;
    context?: string;
    helptag?: string;
    parents?: string[];
    isChapterArticle?: boolean;
    status: string;
    [key: string]: unknown;
}

export interface PagebuilderColumn {
    key: string;
    displayName: string;
}

export interface PagebuilderMatrixData {
    matrix: PagebuilderArticle[][][];
    rows: string[];
    cols: PagebuilderColumn[];
    totalArticles: number;
    totalSize: number;
    avgSize?: number;
}

export interface PagebuilderLegendItem {
    color: string;
    description: string;
}

export interface PagebuilderNavLink {
    label: string;
    url: string;
}

export type MatrixBuilder = (jsonData: PagebuilderArticle[], lang: string) => PagebuilderMatrixData;