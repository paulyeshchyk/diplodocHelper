import { findDefaultAssetsDir } from '../utils/reportBuilder/assets-path.ts';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { collectFootnotes } from './collector.ts';

export interface InjectFootnoteListOptions {
    docsDir: string;
    targetHtml: string;
    lang?: string;
    langPrefix?: string | null;
    /** Переопределить каталог ассетов (`footnoteList.js`, `footnoteList.css`). По умолчанию — `./assets`. */
    assetsDir?: string;
}

export interface InjectFootnoteListResult {
    success: boolean;
    count?: number;
}

export function injectFootnoteList(opts: InjectFootnoteListOptions): InjectFootnoteListResult {
    const { docsDir, targetHtml } = opts;
    const lang = opts.lang ?? 'ru';
    const langPrefix = opts.langPrefix !== undefined ? opts.langPrefix : lang;
    const assetsDir = opts.assetsDir ?? findDefaultAssetsDir('reportFootnoteList');

    if (!fs.existsSync(targetHtml)) {
        console.error(`❌ [footnoteList] Не найден целевой HTML: ${targetHtml}`);
        return { success: false };
    }

    const targetDir = path.dirname(targetHtml);
    const buildRoot = findBuildRoot(targetHtml);

    const relFromRoot = path.relative(buildRoot, targetDir).replace(/\\/g, '/');
    const cssHref = `/${relFromRoot}/footnoteList.css`;
    const dataSrc = `/${relFromRoot}/footnoteList.data.js`;
    const jsSrc = `/${relFromRoot}/footnoteList.js`;

    let urlPrefix = path.relative(targetDir, buildRoot).replace(/\\/g, '/');
    if (urlPrefix && !urlPrefix.endsWith('/')) urlPrefix += '/';

    const items = collectFootnotes(docsDir, langPrefix, urlPrefix);

    fs.writeFileSync(
        path.join(targetDir, 'footnoteList.data.js'),
        `const footnotesData = ${JSON.stringify({ items, lang: langPrefix })};`,
        'utf8'
    );
    fs.copyFileSync(path.join(assetsDir, 'footnoteList.js'), path.join(targetDir, 'footnoteList.js'));
    fs.copyFileSync(path.join(assetsDir, 'footnoteList.css'), path.join(targetDir, 'footnoteList.css'));

    let html = fs.readFileSync(targetHtml, 'utf8');
    const original = html;

    if (!html.includes('footnoteList.css')) {
        html = html.replace('</head>', `<link rel="stylesheet" href="${cssHref}">\n</head>`);
    }
    if (!html.includes('footnoteList.js')) {
        html = html.replace(
            '</body>',
            `<script src="${dataSrc}" defer></script>\n` + `<script src="${jsSrc}" defer></script>\n</body>`
        );
    }

    if (html !== original) {
        fs.writeFileSync(targetHtml, html, 'utf8');
        // console.log(`✓ Перечень сносок внедрён: ${targetHtml} (${items.length} записей)`);
    } else {
        // console.log(`[footnoteList] Без изменений: ${targetHtml}`);
    }
    return { success: true, count: items.length };
}

function findBuildRoot(targetHtml: string): string {
    let dir = path.dirname(path.resolve(targetHtml));
    while (dir && dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, '_assets'))) return dir;
        dir = path.dirname(dir);
    }
    return path.resolve(path.dirname(targetHtml), '..', '..', '..');
}