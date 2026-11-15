import type { GitMeta, YfmMeta, RunGit, Article } from './sources.ts';
import {
    readArticles,
    readGitMeta,
    readYfmMeta,
    resolveYfmPath,
    readPackageVersion,
    resolvePackageJsonPath,
} from './sources.ts';
import { collectStats, type RawStats } from './stats.ts';

const STUB_AUTHOR = '[paul.yestchick](mailto:paul.yestchick@gmail.com)';
const STUB_VERSION = '1.4';

export interface AboutBlock {
    author: string;
    start_date: string;
    version: string;
}

export interface ReportModel {
    about: AboutBlock;
    stats: RawStats & {
        last_update: string;
        commit_hash: string;
    };
}

export interface CollectModelOptions {
    outputDir: string;
    docsDir: string;
    yfmPath?: string;
    packageJsonPath?: string;
    runGit?: RunGit;
}

function pickAuthor(yfm: YfmMeta | null): string {
    if (yfm?.author && String(yfm.author).trim()) return String(yfm.author).trim();
    return STUB_AUTHOR;
}

function pickStartDate(yfm: YfmMeta | null, gitMeta: GitMeta): string {
     // Q3: git (первый коммит) — приоритет; yfm — fallback, если git недоступен/пуст
     if (gitMeta.firstCommitDate) return gitMeta.firstCommitDate;
     if (yfm?.startDate && String(yfm.startDate).trim()) return String(yfm.startDate).trim();
     return 'Сентябрь 2026 г.';
}

function pickVersion(yfm: YfmMeta | null, packageVersion: string | null): string {
    if (yfm?.AppVersion && String(yfm.AppVersion).trim()) return String(yfm.AppVersion).trim();
    if (packageVersion) return packageVersion;
    return STUB_VERSION;
}

function formatLastUpdate(raw: string): string {
    if (raw) return raw;
    const now = new Date();
    return `${now.toLocaleDateString('ru-RU')} ${now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    })}`;
}

/**
 * Агрегатор: собирает `ReportModel` из внешних источников.
 * Возвращает `null`, если критичный источник (articles) недоступен.
 */
export function collectReportModel(opts: CollectModelOptions, articles: Article[]): ReportModel | null {
    if (!articles || articles.length === 0) return null;

    const gitMeta = readGitMeta(opts.docsDir, opts.runGit);
    const yfmPath = resolveYfmPath(opts.docsDir, opts.yfmPath);
    const yfm = readYfmMeta(yfmPath);
    const packageJsonPath = resolvePackageJsonPath(opts.docsDir, opts.packageJsonPath);
    const packageVersion = readPackageVersion(packageJsonPath);

    const stats = collectStats(articles);

    return {
        about: {
            author: pickAuthor(yfm),
            start_date: pickStartDate(yfm, gitMeta),
            version: pickVersion(yfm, packageVersion),
        },
        stats: {
            ...stats,
            last_update: formatLastUpdate(gitMeta.lastCommitDate),
            commit_hash: gitMeta.lastCommitHash,
        },
    };
}