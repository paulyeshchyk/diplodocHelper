const fs = require('fs');
const path = require('path');
const { collectFootnotes } = require('./footnoteList.collector');

/**
 * @param {{docsDir:string; targetHtml: string; lang: string; langPrefix: string? }} opts
 */
function injectFootnoteList({ docsDir, targetHtml, lang = 'ru', langPrefix = null }) {
    if (!fs.existsSync(targetHtml)) {
        console.error(`❌ [footnoteList] Не найден целевой HTML: ${targetHtml}`);
        return { success: false };
    }

    const prefix = langPrefix !== null ? langPrefix : lang;
    const targetDir = path.dirname(targetHtml);
    const buildRoot = findBuildRoot(targetHtml);

    const relFromRoot = path.relative(buildRoot, targetDir).replace(/\\/g, '/');
    const cssHref = `/${relFromRoot}/footnoteList.css`;
    const dataSrc = `/${relFromRoot}/footnoteList.data.js`;
    const jsSrc = `/${relFromRoot}/footnoteList.js`;

    let urlPrefix = path.relative(targetDir, buildRoot).replace(/\\/g, '/');
    if (urlPrefix && !urlPrefix.endsWith('/')) urlPrefix += '/';

    const items = collectFootnotes(docsDir, prefix, urlPrefix);

    fs.writeFileSync(
        path.join(targetDir, 'footnoteList.data.js'),
        `const footnotesData = ${JSON.stringify({ items: items, lang: prefix })};`,
        'utf8'
    );
    fs.copyFileSync(path.join(__dirname, 'footnoteList.js'), path.join(targetDir, 'footnoteList.js'));
    fs.copyFileSync(path.join(__dirname, 'footnoteList.css'), path.join(targetDir, 'footnoteList.css'));

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
        console.log(`✓ Перечень сносок внедрён: ${targetHtml} (${items.length} записей)`);
    } else {
        console.log(`[footnoteList] Без изменений: ${targetHtml}`);
    }
    return { success: true, count: items.length };
}

/**
 * @param {string} targetHtml
 */
function findBuildRoot(targetHtml) {
    let dir = path.dirname(path.resolve(targetHtml));
    while (dir && dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, '_assets'))) return dir;
        dir = path.dirname(dir);
    }
    return path.resolve(path.dirname(targetHtml), '..', '..', '..');
}

/**
 * @param {string} html
 */
function injectContainerIntoState(html) {
    const stateRe = /(<script\s+id="diplodoc-state"[^>]*>)([\s\S]*?)(<\/script>)/;
    const m = html.match(stateRe);
    if (!m) return html;

    let json;
    try {
        json = JSON.parse(m[2].trim());
    } catch (e) {
        let msg = e instanceof Error ? e.message : String(e);
        console.warn('[footnoteList] Не удалось распарсить diplodoc-state:', msg);
        return html;
    }

    if (!json || !json.data || typeof json.data.html !== 'string') return html;
    if (json.data.html.includes('id="footnotes-container"')) return html;

    json.data.html += '\n<div id="footnotes-container"></div>';
    return html.replace(stateRe, `$1${JSON.stringify(json)}$3`);
}

module.exports = { injectFootnoteList };
