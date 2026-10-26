const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { defaultTitleValue, defaultHintValue, defaultContextValue, defaultHelptagValue } = require('./helpmap.config');

/**
 * @param {string} docsDir
 * @returns {import('./helpmap.types').CollectResult}
 */
function collectHelpData(docsDir) {
    /** @type {import('./helpmap.types').HelpEntry[]} */
    const success = [];
    /** @type {string[]} */
    const failed = [];

    /**
     * @param {string} dir
     */
    function walk(dir) {
        if (!fs.existsSync(dir))
            //
            return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (file.startsWith('.'))
                //
                continue;
            if (fs.statSync(fullPath).isDirectory()) {
                walk(fullPath);
            } else if (file.endsWith('.md')) {
                mdFlow(fullPath, docsDir, success, failed);
            }
        }
    }
    walk(docsDir);
    return { success, failed };
}

/**
 * Получает массив заголовков для всех родительских папок (от дальнего к ближайшему).
 * @param {string} fullPath - путь к текущему MD-файлу
 * @param {string} docsDir - корневая папка документации
 * @returns {string[]}
 */
function getParentTitles(fullPath, docsDir) {
    const relPath = path.relative(docsDir, fullPath);
    const parts = relPath.split(path.sep).filter(p => p);
    let startIdx = 0;
    if (parts.length > 0 && parts[0].length === 2 && /^[a-z]{2}$/.test(parts[0])) {
        startIdx = 1;
    }
    const parentParts = parts.slice(startIdx, -1);
    const titles = [];
    for (const parent of parentParts) {
        const parentDir = path.join(docsDir, ...parts.slice(0, startIdx + parentParts.indexOf(parent) + 1));
        const indexMdPath = path.join(parentDir, 'index.md');
        let title = parent;
        if (fs.existsSync(indexMdPath)) {
            try {
                const content = fs.readFileSync(indexMdPath, 'utf8');
                const { data } = matter(content);
                // Приоритет: title (полное название) > pureTitle
                if (data.title && String(data.title).trim() !== '') {
                    title = String(data.title).trim();
                } else if (data.pureTitle && String(data.pureTitle).trim() !== '') {
                    title = String(data.pureTitle).trim();
                }
            } catch (e) { 
                console.error(e);
            }
        }
        titles.push(title);
    }
    return titles;
}

/**
 * @param {string} fullPath
 * @param {string} docsDir
 * @param {import('./helpmap.types').HelpEntry[]} success
 * @param {string[]} failed
 */
function mdFlow(fullPath, docsDir, success, failed) {
    try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const { data } = matter(content);
        let title = '';
        // Приоритет: title > pureTitle
        if (data.title && String(data.title).trim() !== '') {
            title = String(data.title).trim();
        } else if (data.pureTitle && String(data.pureTitle).trim() !== '') {
            title = String(data.pureTitle).trim();
        }
        let relativePath = path.relative(docsDir, fullPath).replace(/\.md$/, '').replace(/\\/g, '/');
        if (relativePath.endsWith('/index') || relativePath === 'index') {
            relativePath += '.html';
        } else if (!relativePath.endsWith('.html')) {
            relativePath += '.html';
        }
        const lang = relativePath.split('/')[0] || 'default';
        const stats = fs.statSync(fullPath);
        const size = stats.size;
        const parents = getParentTitles(fullPath, docsDir);
        const entry = {
            url: relativePath,
            title: title.trim() || defaultTitleValue,
            size: size,
            hint: data.hint?.trim() || defaultHintValue,
            helptag: data.helptag?.trim() || defaultHelptagValue,
            context: data.context?.trim() || defaultContextValue,
            lang,
            parents,
        };
        success.push(entry);
    } catch (err) {
        const msg = err instanceof Error ? err.message : `${err}`;
        console.error(`❌ Ошибка обработки файла ${fullPath}:`, msg);
        failed.push(fullPath);
    }
}

module.exports = { collectHelpData };
