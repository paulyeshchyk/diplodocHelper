import * as fs from 'node:fs';
import * as path from 'node:path';

export function findDefaultAssetsDir(modulePath: string): string {
    const candidates: string[] = [];

    // 1) extension runtime: <bundle-dir>/assets/<modulePath>
    //    __dirname в CJS-бандле = <extension>/dist
    //    __dirname в tsx (ESM) = каталог исходного файла → кандидат не существует, провалится
    if (typeof __dirname !== 'undefined') {
        candidates.push(path.resolve(__dirname, 'assets', modulePath));
    }

    // 2) docs-project (без src/): <cwd>/plugins/<modulePath>/assets
    candidates.push(path.resolve(process.cwd(), 'plugins', modulePath, 'assets'));

    // 3) docs-project (с src/): <cwd>/src/plugins/<modulePath>/assets
    candidates.push(path.resolve(process.cwd(), 'src', 'plugins', modulePath, 'assets'));

    for (const c of candidates) {
        if (fs.existsSync(c)) return c;
    }

    // Fallback: первый кандидат — для информативного предупреждения
    return candidates[0]!;
}

export function findDefaultSharedAssetsDir(): string {
    return findDefaultAssetsDir('utils/reportBuilder');   // ← было 'reportBuilder'
}