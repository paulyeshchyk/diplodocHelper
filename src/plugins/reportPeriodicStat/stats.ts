import type { Article } from './sources.ts';
import { parseUrlParts } from '../utils/reportBuilder/sections.ts';

/** Безопасно читает поле как массив строк (поддерживает string, array, undefined). */
function readMulti(raw: unknown): string[] {
    if (Array.isArray(raw)) {
        return raw.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
    }
    if (typeof raw === 'string') {
        return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    }
    return [];
}

/** Безопасно приводит значение к строке для regex-проверок. */
function safeStr(v: unknown): string {
    return typeof v === 'string' ? v : '';
}

export function totalArticles(articles: Article[]): number {
    return articles.length;
}

export function totalSize(articles: Article[]): number {
    return articles.reduce((sum, item) => sum + (Number(item.size) || 0), 0);
}

export function avgSize(articles: Article[]): number {
    const n = totalArticles(articles);
    return n ? Math.round(totalSize(articles) / n) : 0;
}

export function readingTime(avgSizeBytes: number): number {
    return Math.ceil(avgSizeBytes / 2500);
}

// Разделы и главы считаем по URL, а не по title:
// title — заголовок статьи («Введение»), а «Раздел 1 / Глава 1» живут в URL.
export function totalSections(articles: Article[]): number {
    const set = new Set<string>();
    for (const item of articles) {
        const url = safeStr(item.url);
        if (!url) continue;
        const { sectionName } = parseUrlParts(url);
        if (sectionName) set.add(sectionName);
    }
    return set.size;
}

export function totalChapters(articles: Article[]): number {
    const set = new Set<string>();
    for (const item of articles) {
        const url = safeStr(item.url);
        if (!url) continue;
        const { sectionName, chapterName } = parseUrlParts(url);
        if (chapterName) set.add(`${sectionName ?? ''}::${chapterName}`);
    }
    return set.size;
}

export function totalContexts(articles: Article[]): number {
    const set = new Set<string>();
    for (const item of articles) {
        for (const v of readMulti(item.context)) set.add(v);
    }
    return set.size;
}

export function totalHelptags(articles: Article[]): number {
    const set = new Set<string>();
    for (const item of articles) {
        for (const v of readMulti(item.helptag)) set.add(v);
    }
    return set.size;
}

export interface RawStats {
    totalArticles: number;
    avgSize: number;
    readingTime: number;
    totalSections: number;
    totalChapters: number;
    totalContexts: number;
    totalHelptags: number;
}

export function collectStats(articles: Article[]): RawStats {
    const avg = avgSize(articles);
    return {
        totalArticles: totalArticles(articles),
        avgSize: avg,
        readingTime: readingTime(avg),
        totalSections: totalSections(articles),
        totalChapters: totalChapters(articles),
        totalContexts: totalContexts(articles),
        totalHelptags: totalHelptags(articles),
    };
}