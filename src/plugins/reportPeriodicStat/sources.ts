import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';

export interface Article {
    title?: string;
    url?: string;
    lang?: string;
    size?: number;
    context?: unknown;   
    helptag?: unknown;   
    [key: string]: unknown;
}

export interface GitMeta {
    firstCommitDate: string;
    lastCommitHash: string;
    lastCommitDate: string;
}

export interface YfmMeta {
    author?: string;
    startDate?: string;
    AppVersion?: string;
    [key: string]: unknown;
}

export type RunGit = (command: string) => string | null;

const STAT_FILENAME = 'app-help-contents.json';
const GIT_META_FILENAME = 'git-meta.json';
const YFM_FILENAME = '.yfm';
const PACKAGE_JSON_FILENAME = 'package.json';

// ---------- articles ----------

export function readArticles(outputDir: string): Article[] | null {
    const p = path.join(outputDir, STAT_FILENAME);
    if (!fs.existsSync(p)) {
        console.error(`❌ Файл ${p} не найден. Сначала сгенерируйте ${STAT_FILENAME}`);
        return null;
    }
    try {
        const raw = fs.readFileSync(p, 'utf8');
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) {
            console.error(`❌ Ожидался массив в ${p}`);
            return null;
        }
        return data as Article[];
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`❌ Не удалось прочитать ${p}: ${msg}`);
        return null;
    }
}

// ---------- git ----------

function defaultRunGit(command: string): string | null {
    try {
        return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
        return null;
    }
}

export function readGitMeta(docsDir: string, runGit: RunGit = defaultRunGit): GitMeta {
    const gitMetaPath = path.join(docsDir, GIT_META_FILENAME);

    let gitMeta: GitMeta = {
        firstCommitDate: '',
        lastCommitHash: 'unknown',
        lastCommitDate: '',
    };

    if (fs.existsSync(gitMetaPath)) {
        try {
            gitMeta = JSON.parse(fs.readFileSync(gitMetaPath, 'utf8'));
        } catch {
            console.log('Предупреждение: Не удалось распарсить git-meta.json, используем дефолт.');
        }
    }

    const isCI = process.env.TF_BUILD || process.env.CI;

    if (!isCI) {
        const firstDate = runGit(
            'git log --all --max-parents=0 --reverse -n 1 --format=%ad --date=format:"%d.%m.%Y"'
        );
        const lastLog = runGit('git log -1 --format="%ad|%H" --date=format:"%d.%m.%Y %H:%M"');

        if (firstDate) gitMeta.firstCommitDate = firstDate;
        if (lastLog && lastLog.includes('|')) {
            const [date, hash] = lastLog.split('|');
            gitMeta.lastCommitDate = date!;
            gitMeta.lastCommitHash = hash!;
        }

        try {
            fs.writeFileSync(gitMetaPath, JSON.stringify(gitMeta, null, 2), 'utf8');
            // console.log('=== Локально: Файл git-meta.json успешно обновлен ===');
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('Не удалось записать git-meta.json:', msg);
        }
    } else {
        // console.log('=== Сборка на CI: используем зафиксированные Git-данные из git-meta.json ===');
    }

    return gitMeta;
}

// ---------- yfm ----------

/**
 * Ищет `.yfm` в проекте. Приоритет:
 *   1. `explicitPath` (если задан)
 *   2. `docsDir/.yfm` (у вас .yfm лежит в docs/)
 *   3. `docsDir/../.yfm` (на случай, если docsDir = <root>/docs/<lang>)
 */
export function resolveYfmPath(docsDir: string, explicitPath?: string): string | null {
    if (explicitPath) return fs.existsSync(explicitPath) ? explicitPath : null;
    const candidates = [
        path.join(docsDir, YFM_FILENAME),
        path.join(docsDir, '..', YFM_FILENAME),
    ];
    for (const c of candidates) {
        if (fs.existsSync(c)) return path.resolve(c);
    }
    return null;
}

export function readYfmMeta(yfmPath: string | null): YfmMeta | null {
    if (!yfmPath || !fs.existsSync(yfmPath)) return null;
    try {
        const raw = fs.readFileSync(yfmPath, 'utf8').trim();
        if (!raw) return null;
        const wrapped = `---\n${raw}\n---`;
        const { data } = matter(wrapped);
        return (data as YfmMeta) ?? null;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`Предупреждение: не удалось прочитать ${yfmPath}: ${msg}`);
        return null;
    }
}

// ---------- package.json ----------

export function resolvePackageJsonPath(docsDir: string, explicitPath?: string): string | null {
    if (explicitPath) return fs.existsSync(explicitPath) ? explicitPath : null;
    // <root>/docs → <root>/package.json
    const candidate = path.join(docsDir, '..', PACKAGE_JSON_FILENAME);
    return fs.existsSync(candidate) ? path.resolve(candidate) : null;
}

export function readPackageVersion(packageJsonPath: string | null): string | null {
    if (!packageJsonPath || !fs.existsSync(packageJsonPath)) return null;
    try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return typeof pkg.version === 'string' ? pkg.version : null;
    } catch {
        return null;
    }
}