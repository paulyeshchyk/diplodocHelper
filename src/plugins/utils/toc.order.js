// src/plugins/utils/toc.order.js
const fs = require('fs');
const path = require('path');
const { TocYamlFileLoad } = require('./yaml.toc.file');

/** @import { TocYamlItem, TocYaml } from './yaml.toc.file' */

/**
 * @param {TocYamlItem[] | (TocYaml & any[]) | undefined} entries
 * @param {string} rootDir
 * @returns {string[]}
 */
function collectMdFilesInOrder(entries, rootDir, currentPath = '', visited = new Set()) {
    if (!entries) return [];

    const items = Array.isArray(entries) ? entries : [entries];
    let files = [];

    for (const entry of items) {
        if (entry.href) {
            const href = entry.href.trim();
            if (href.endsWith('toc.yaml') || href.endsWith('index.yaml')) continue;

            let mdPath = path.join(rootDir, currentPath, href);
            if (!href.endsWith('.md')) mdPath = path.join(mdPath, 'index.md');

            if (fs.existsSync(mdPath)) files.push(mdPath);
        }

        if (entry.include?.path) {
            const absIncludePath = path.join(rootDir, currentPath, entry.include.path);
            const canonical = path.resolve(absIncludePath);
            if (!visited.has(canonical)) {
                visited.add(canonical);
                try {
                    const toc = TocYamlFileLoad(absIncludePath);
                    const includeDir = path.join(currentPath, path.dirname(entry.include.path));
                    files.push(...collectMdFilesInOrder(toc.items, rootDir, includeDir, visited));
                } catch (err) {
                    let msg = err instanceof Error ? err.message : String(err);
                    console.error(`❌ Не удалось загрузить include ${absIncludePath}:`, msg);
                }
            }
        }

        if (Array.isArray(entry.items)) {
            files.push(...collectMdFilesInOrder(entry.items, rootDir, currentPath, visited));
        }
    }
    return files;
}

/**
 * Упорядоченный список md-файлов раздела.
 * Если toc.yaml нет — откат на обход каталога (порядок будет нестабильным).
 * @param {string} rootDir
 */
function collectMdFilesByToc(rootDir) {
    const tocPath = path.join(rootDir, 'toc.yaml');
    if (!fs.existsSync(tocPath)) {
        // fallback
        const out = [];
        (function walk(dir) {
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                if (e.name.startsWith('.') || e.name === 'node_modules') continue;
                const full = path.join(dir, e.name);
                if (e.isDirectory()) walk(full);
                else if (e.name.endsWith('.md')) out.push(full);
            }
        })(rootDir);
        return out;
    }
    const toc = TocYamlFileLoad(tocPath);
    const entries = Array.isArray(toc) ? toc : toc?.items || [];
    return collectMdFilesInOrder(entries, rootDir);
}

module.exports = { collectMdFilesInOrder, collectMdFilesByToc };
