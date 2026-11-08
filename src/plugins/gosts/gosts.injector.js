// gosts.injector.js
const fs   = require('fs');
const path = require('path');
const { loadGostDictionary, getGostDictionaryPath } = require('./gosts.dictionary');
const { slugify_latin_alphanumeric } = require('../utils/encoding.slugify.js');
const { collectGostReferences } = require('./gosts.collector');

// ── термины ──────────────────────────────────────────────────────────
const { loadTermDictionary }  = require('../terms/terms.dictionary.js');
const { getTermOutputUrl }    = require('../terms/terms.paths.js');
const { termAnchorId }        = require('../terms/terms.model.js');
const { renderTooltipHtml: renderTermTooltipHtml } =
    require('../terms/terms.injector.js');

// ── аббревиатуры ─────────────────────────────────────────────────────
const { loadAbbrDictionary }  = require('../abbrs/abbrs.dictionary.js');
const { getAbbrOutputUrl }    = require('../abbrs/abbrs.paths.js');
const { abbrAnchorId }        = require('../abbrs/abbrs.model.js');
const { renderTooltipHtml: renderAbbrTooltipHtml } =
    require('../abbrs/abbrs.injector.js');

function escHtmlText(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * «Сырой» <abbr class="term" data-term="…">…</abbr>
 *   → <span class="dl-term">…tooltip…</span>
 * Идемпотентен: если уже внутри .dl-term — пропускает.
 */
function enrichTermAbbrInText(text, termsDict, lang) {
    if (!text || !termsDict || termsDict.size === 0) return text;

    const linkText  = lang === 'ru' ? 'см. Термины' : 'see Terms';
    const outputUrl = getTermOutputUrl(lang);

    return text.replace(
        /<abbr(\b[^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*)>([^<]+)<\/abbr>/gi,
        (match, attrs, inner, offset, fullText) => {
            const innerText = inner.trim();
            if (!innerText) return match;

            const before = fullText.substring(Math.max(0, offset - 80), offset);
            if (/<span[^>]*\bclass\s*=\s*["'][^"']*\bdl-term\b[^"']*["'][^>]*>\s*$/i.test(before)) {
                return match;
            }

            const dt = attrs.match(/\bdata-term\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
            const dataTerm   = dt ? ((dt[1] ?? dt[2]) || '').trim() : '';
            const lookupTerm = dataTerm || innerText;

            const def = termsDict.get(lookupTerm);
            if (!def) return match;

            return renderTermTooltipHtml({
                term: lookupTerm,
                definition: def.definition,
                description: def.description,
                attrs,
                idAttr: '',                                   // в data.js id не нужен
                inner: innerText,
                linkHref: `${outputUrl}#${termAnchorId(lookupTerm)}`,
                linkText,
            });
        }
    );
}

/**
 * «Сырой» <abbr data-abbr="…">…</abbr>
 *   → <span class="dl-abbr">…tooltip…</span>
 * Пропускает <abbr class="…"> (уже обработано terms) и <abbr title="…"> (inline-override).
 */
function enrichAbbrInText(text, abbrsDict, lang) {
    if (!text || !abbrsDict || abbrsDict.size === 0) return text;

    const linkText  = lang === 'ru' ? 'см. Аббревиатуры' : 'see Abbreviations';
    const outputUrl = getAbbrOutputUrl(lang);

    return text.replace(
        /<abbr(\b[^>]*)>([^<]+)<\/abbr>/gi,
        (match, attrs, inner, offset, fullText) => {
            const innerText = inner.trim();
            if (!innerText) return match;
            if (/\bclass\s*=/.test(attrs)) return match;      // <abbr class="…"> — чужое
            if (/\btitle\s*=/.test(attrs)) return match;      // user override

            const before = fullText.substring(Math.max(0, offset - 80), offset);
            if (/<span[^>]*\bclass\s*=\s*["'][^"']*\bdl-abbr\b[^"']*["'][^>]*>\s*$/i.test(before)) {
                return match;
            }

            const da = attrs.match(/\bdata-abbr\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
            const dataAbbr   = da ? ((da[1] ?? da[2]) || '').trim() : '';
            const lookupAbbr = dataAbbr || innerText;

            const def = abbrsDict.get(lookupAbbr);
            if (!def) return match;

            return renderAbbrTooltipHtml({
                abbr: lookupAbbr,
                full: def.full,
                description: def.description,
                attrs,
                idAttr: '',
                inner: innerText,
                linkHref: `${outputUrl}#${abbrAnchorId(lookupAbbr)}`,
                linkText,
            });
        }
    );
}

/** Единая точка обогащения — вызывать из injectGostsTable. */
function enrichAbbrsAndTerms(text, { termsDict, abbrsDict, lang }) {
    if (!text) return text;
    const withTerms = enrichTermAbbrInText(text, termsDict, lang);
    return enrichAbbrInText(withTerms, abbrsDict, lang);
}



/**
 * Оборачивает «сырые» <abbr class="term" data-term="…">…</abbr>
 * в <span class="dl-term"> со «взрослым» тултипом (title + desc + footer-link).
 * Идемпотентна: если <abbr> уже внутри .dl-term — не трогаем.
 *
 * @param {string} text
 * @param {Map<string,{term:string, definition:string, description?:string}>} termDict
 * @param {string} lang
 * @returns {string}
 */
function enrichTermAbbr(text, termDict, lang) {
    if (!text || !termDict || termDict.size === 0) return text;

    const linkText  = lang === 'ru' ? 'см. Термины' : 'see Terms';
    const outputUrl = getTermOutputUrl(lang);

    return text.replace(
        /<abbr(\b[^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*)>([^<]+)<\/abbr>/gi,
        (match, attrs, inner, offset, fullText) => {
            const innerText = inner.trim();
            if (!innerText) return match;

            // Уже обёрнуто в .dl-term? — выходим (идемпотентность).
            const before = fullText.substring(Math.max(0, offset - 80), offset);
            if (/<span[^>]*\bclass\s*=\s*["'][^"']*\bdl-term\b[^"']*["'][^>]*>\s*$/i.test(before)) {
                return match;
            }

            const dtMatch = attrs.match(/\bdata-term\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
            const dataTerm = dtMatch ? ((dtMatch[1] ?? dtMatch[2]) || '').trim() : '';
            const lookupTerm = dataTerm || innerText;

            const def = termDict.get(lookupTerm);
            if (!def) return match; // нет определения — оставляем как было

            const hasId = /\bid\s*=/.test(attrs);
            const anchor = termAnchorId(lookupTerm);
            const href   = `${outputUrl}#${anchor}`;

            return renderTermTooltipHtml({
                term: lookupTerm,
                definition: def.definition,
                description: def.description,
                attrs,                                 // class/data-term/… как были
                idAttr: hasId ? '' : '',               // id в таблице не нужен (см. пояснение ниже)
                inner: innerText,                      // видимый текст не меняем
                linkHref: href,
                linkText,
            });
        }
    );
}

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

    const termDict = loadTermDictionary(langDir, lang);
    const abbrDict = loadAbbrDictionary(langDir, lang);
    const enrichCtx = { termsDict: termDict, abbrsDict: abbrDict, lang };

    for (const item of entries) {
        if (item.description) item.description = resolveMarkdownLinks(item.description, yamlDir, docsRoot);
        if (item.title)       item.title       = resolveMarkdownLinks(item.title,       yamlDir, docsRoot);
        if (item.status)      item.status      = resolveMarkdownLinks(item.status,      yamlDir, docsRoot);

        if (item.description) item.description = enrichAbbrsAndTerms(item.description, enrichCtx);
        if (item.title)       item.title       = enrichAbbrsAndTerms(item.title,       enrichCtx);
        if (item.status)      item.status      = enrichAbbrsAndTerms(item.status,      enrichCtx);

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

    fs.copyFileSync(path.join(__dirname, 'gosts.client.js'), path.join(targetDir, 'gosts.js'));
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