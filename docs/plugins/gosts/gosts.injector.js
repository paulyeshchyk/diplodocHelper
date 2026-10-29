// gosts.injector.js
const fs = require('fs');
const path = require('path');
const { loadGostDictionary, getGostDictionaryPath } = require('./gosts.dictionary');
const { slugify_latin_alphanumeric } = require('../utils/encoding.slugify.js');
const { collectGostReferences } = require('./gosts.collector'); // <-- ДОБАВЛЕНО

function findBuildRoot(targetHtml) {
    let dir = path.dirname(path.resolve(targetHtml));
    while (dir && dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, '_assets'))) return dir;
        dir = path.dirname(dir);
    }
    return path.resolve(path.dirname(targetHtml), '..', '..', '..');
}

/**
 * Конвертирует Markdown-ссылки (.md) в абсолютные HTML-ссылки (/ru/.../index.html#anchor).
 * Это решает проблему 404 при клике на ссылку внутри карточки.
 */
function resolveMarkdownLinks(text, yamlDir, docsRoot) {
    if (!text) return text;
    return text.replace(/\[([^\]]+)\]\(([^)]+\.md)(#[^)]+)?\)/g, (match, linkText, mdPath, hash) => {
        const h = hash || '';
        if (/^https?:\/\//i.test(mdPath)) return match;               // внешние не трогаем
        if (mdPath.startsWith('/')) {                                 // абсолютный путь от корня
            return `[${linkText}](${mdPath.replace(/\.md$/, '.html')}${h})`;
        }
        try {
            const absMdPath = path.resolve(yamlDir, mdPath);
            const relToDocs = path.relative(docsRoot, absMdPath).replace(/\\/g, '/');
            const finalUrl = `/${relToDocs.replace(/\.md$/, '.html')}${h}`;
            return `[${linkText}](${finalUrl})`;
        } catch { return match; }
    });
}

function injectGostsTable({ langDir, targetHtml, lang }) {
    if (!fs.existsSync(targetHtml)) {
        console.error(`❌ [gosts] Не найден целевой HTML: ${targetHtml}`);
        return { success: false };
    }

    const targetDir = path.dirname(targetHtml);
    const buildRoot = findBuildRoot(targetHtml);

    const relFromRoot = path.relative(buildRoot, targetDir).replace(/\\/g, '/');
    const cssHref = `/${relFromRoot}/gosts.css`;
    const dataSrc = `/${relFromRoot}/gosts.data.js`;
    const jsSrc = `/${relFromRoot}/gosts.js`;

    const dictPath = getGostDictionaryPath(langDir, lang);
    const yamlDir = path.dirname(dictPath);
    const resolvedLangDir = path.resolve(langDir);
    const docsRoot = path.dirname(resolvedLangDir);

    const entries = loadGostDictionary(langDir, lang);

    for (const item of entries) {
        if (item.description) item.description = resolveMarkdownLinks(item.description, yamlDir, docsRoot);
        if (item.title) item.title = resolveMarkdownLinks(item.title, yamlDir, docsRoot);
        if (item.status) item.status = resolveMarkdownLinks(item.status, yamlDir, docsRoot);
        if (item.code) item.anchorId = `gost-${slugify_latin_alphanumeric(item.code)}`;
    }

    // --- СБОР ССЫЛОК НА ГОСТЫ ---
    const refs = collectGostReferences(langDir, entries);
    for (const item of entries) {
        item.pages = refs[item.anchorId] || [];

        //сортируем по алфавиту
        item.pages.sort((a, b) => String(a.title).localeCompare(String(b.title), 'ru', { numeric: true }));

        // // Сортируем: сначала по убыванию количества упоминаний, 
        // // затем по алфавиту (если количество совпадает)
        // item.pages.sort((a, b) => {
        //     if (b.occurrences !== a.occurrences) {
        //         return b.occurrences - a.occurrences;
        //     }
        //     return String(a.title).localeCompare(String(b.title), 'ru', { numeric: true });
        // });
    }
    // ----------------------------

    // Передаем язык в data.js
    const dataContent = `window.__GOSTS_LANG__ = "${lang}";\nwindow.__GOSTS_DATA__ = ${JSON.stringify(entries)};`;
    fs.writeFileSync(path.join(targetDir, 'gosts.data.js'), dataContent, 'utf8');

    fs.copyFileSync(path.join(__dirname, 'gosts.js'), path.join(targetDir, 'gosts.js'));
    fs.copyFileSync(path.join(__dirname, 'gosts.css'), path.join(targetDir, 'gosts.css'));

    let html = fs.readFileSync(targetHtml, 'utf8');
    const original = html;

    if (!html.includes('gosts.css')) {
        html = html.replace('</head>', `<link rel="stylesheet" href="${cssHref}">\n</head>`);
    }
    if (!html.includes('gosts.data.js')) {
        html = html.replace('</body>', `<script src="${dataSrc}" defer></script>\n</body>`);
    }
    if (!html.includes('gosts.js')) {
        html = html.replace('</body>', `<script src="${jsSrc}" defer></script>\n</body>`);
    }

    if (html !== original) {
        fs.writeFileSync(targetHtml, html, 'utf8');
    }

    console.log(`✓ Таблица ГОСТов внедрена: ${targetHtml} (${entries.length} записей)`);
    return { success: true, count: entries.length };
}

module.exports = { injectGostsTable };