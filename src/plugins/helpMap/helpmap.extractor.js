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
 * @param {string} fullPath
 * @param {string} docsDir
 * @param {import('./helpmap.types').HelpEntry[]} success
 * @param {string[]} failed
 */
function mdFlow(fullPath, docsDir, success, failed) {
    try {
        const content = fs.readFileSync(fullPath, 'utf8');
        // @ts-ignore
        const { data } = matter(content);
        let title = '';
        if (data.pureTitle && String(data.pureTitle).trim() !== '') {
            title = String(data.pureTitle).trim();
        } else if (data.title && String(data.title).trim() !== '') {
            title = String(data.title).trim();
        }
        let relativePath = path.relative(docsDir, fullPath).replace(/\.md$/, '').replace(/\\/g, '/');
        if (relativePath.endsWith('/index') || relativePath === 'index') {
            relativePath += '.html';
        } else if (!relativePath.endsWith('.html')) {
            relativePath += '.html';
        }
        const lang = relativePath.split('/')[0] || 'default';

        /** @type {import('./helpmap.types').HelpEntry} */
        const entry = {
            url: relativePath,
            title: title.trim() || defaultTitleValue,
            hint: data.hint?.trim() || defaultHintValue,
            helptag: data.helptag?.trim() || defaultHelptagValue,
            context: data.context?.trim() || defaultContextValue,
            lang,
        };
        success.push(entry);
    } catch (err) {
        const msg = err instanceof Error ? err.message : `${err}`;
        console.error(`Ошибка обработки файла ${fullPath}:`, msg);
        failed.push(fullPath);
    }
}

module.exports = { collectHelpData };
