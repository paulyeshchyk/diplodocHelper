// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { loadAbbrDictionary } = require('./abbrs.dictionary');
const { renderTemplate } = require('./abbrs.template.js');
const ABBR_CONFIG = require('./abbrs.config.js');
const { getAbbrOutputUrl, getAbbrLanguages } = require('./abbrs.paths');
const { maskCodeBlocks } = require('./shared');

const { abbrAnchorId, abbrOccurrenceId, escapeHtml, jsonEscapeHtmlForDiplodoc } = require('./abbrs.model');

function isInsideAnchor(html, matchIndex) {
    const before = html.substring(0, matchIndex);
    return before.lastIndexOf('<a ') > before.lastIndexOf('</a>');
}

/**
 * Достаёт значение data-abbr из строки атрибутов.
 * @param {string} attrs
 * @param {boolean} [jsonEscaped] — true для JSON-escaped варианта (`\"`)
 * @returns {string} пустая строка, если атрибута нет
 */
function extractDataAbbr(attrs, jsonEscaped = false) {
    const re = jsonEscaped
        ? /\bdata-abbr\s*=\s*\\"([^\\"]*)\\"/i
        : /\bdata-abbr\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
    const m = attrs.match(re);
    if (!m) return '';
    return (m[1] !== undefined ? m[1] : m[2] || '').trim();
}

function renderTooltipHtml(p) {
    let content = renderTemplate('tooltip.title.html', {
        ABBR: escapeHtml(p.abbr),
        FULL: p.full,
    });
    if (p.description) {
        content += renderTemplate('tooltip.description.html', {
            DESCRIPTION: escapeHtml(p.description),
        });
    }
    if (p.linkHref) {
        content += renderTemplate('tooltip.link.html', {
            HREF: escapeHtml(p.linkHref),
            TEXT: escapeHtml(p.linkText || ''),
        });
    }

    return renderTemplate('tooltip.html', {
        ATTRS: p.attrs,
        ID_ATTR: p.idAttr,
        ARIA_LABEL: escapeHtml(p.full),
        INNER: escapeHtml(p.inner),
        CONTENT: content,
    });
}

function renderTooltipForJson(p) {
    return jsonEscapeHtmlForDiplodoc(renderTooltipHtml(p));
}

function injectAbbrTitlesIntoHtml(html, dictionary, lang) {
    const masked = maskCodeBlocks(html);
    const linkText = lang === 'ru' ? 'см. Аббревиатуры' : 'see Abbreviations';
    const outputUrl = getAbbrOutputUrl(lang);

    let replaced = 0;
    let unmatched = 0;
    const unmatchedSet = new Set();
    // ключ — каноническое сокращение (data-abbr или inner)
    const occurrences = new Map();

    // ---- Ветка 1: raw HTML ----
    let result = masked.masked.replace(/<abbr(\b[^>]*)>([^<]+)<\/abbr>/gi, (match, attrs, inner, offset, full) => {
        const innerText = inner.trim();
        if (!innerText) return match;
        if (/\bclass\s*=/.test(attrs)) return match;   // <abbr class="…"> — чужое

        const dataAbbr = extractDataAbbr(attrs, false);
        const lookupAbbr = dataAbbr || innerText;

        const hasId = /\bid\s*=/.test(attrs);
        const def = dictionary.get(lookupAbbr);

        if (/\btitle\s*=/.test(attrs)) {
            if (hasId) return match;
            const n = (occurrences.get(lookupAbbr) || 0) + 1;
            occurrences.set(lookupAbbr, n);
            return `<abbr${attrs} id="${abbrOccurrenceId(lookupAbbr, n)}">${inner}</abbr>`;
        }

        if (!def) {
            unmatched++;
            unmatchedSet.add(lookupAbbr);
            if (hasId) return match;
            const n = (occurrences.get(lookupAbbr) || 0) + 1;
            occurrences.set(lookupAbbr, n);
            return `<abbr${attrs} id="${abbrOccurrenceId(lookupAbbr, n)}">${inner}</abbr>`;
        }

        replaced++;
        const n = (occurrences.get(lookupAbbr) || 0) + 1;
        occurrences.set(lookupAbbr, n);

        const occId = abbrOccurrenceId(lookupAbbr, n);
        const idAttr = hasId ? '' : ` id="${occId}"`;
        const anchor = abbrAnchorId(lookupAbbr);
        const href = `${outputUrl}#${anchor}`;
        const skipLink = isInsideAnchor(full, offset);

        return renderTooltipHtml({
            abbr: lookupAbbr,        // в tooltip title идёт каноническое сокращение
            full: def.full,
            description: def.description,
            attrs,                   // сохраняет class="term"? нет, class пропущен выше; сохраняет data-abbr и id
            idAttr,
            inner: innerText,        // видимый текст не меняем
            linkHref: skipLink ? undefined : href,
            linkText,
        });
    });

    // ---- Ветка 2: JSON-escaped HTML (&lt;abbr …&gt;…&lt;/abbr&gt;) ----
    result = result.replace(/&lt;abbr(\b[^&]*?)&gt;([^&]+)&lt;\/abbr&gt;/gi, (match, attrs, inner) => {
        const innerText = inner.trim();
        if (!innerText) return match;
        if (/\bclass\s*=/.test(attrs)) return match;

        const dataAbbr = extractDataAbbr(attrs, true);
        const lookupAbbr = dataAbbr || innerText;

        const hasId = /\bid\s*=/.test(attrs);
        const def = dictionary.get(lookupAbbr);

        if (/\btitle\s*=/.test(attrs)) {
            if (hasId) return match;
            const n = (occurrences.get(lookupAbbr) || 0) + 1;
            occurrences.set(lookupAbbr, n);
            return `&lt;abbr${attrs} id=\\"${abbrOccurrenceId(lookupAbbr, n)}\\"&gt;${inner}&lt;/abbr&gt;`;
        }

        if (!def) {
            unmatched++;
            unmatchedSet.add(lookupAbbr);
            if (hasId) return match;
            const n = (occurrences.get(lookupAbbr) || 0) + 1;
            occurrences.set(lookupAbbr, n);
            return `&lt;abbr${attrs} id=\\"${abbrOccurrenceId(lookupAbbr, n)}\\"&gt;${inner}&lt;/abbr&gt;`;
        }

        replaced++;
        const n = (occurrences.get(lookupAbbr) || 0) + 1;
        occurrences.set(lookupAbbr, n);

        const occId = abbrOccurrenceId(lookupAbbr, n);
        const idAttr = hasId ? '' : ` id="${occId}"`;
        const anchor = abbrAnchorId(lookupAbbr);
        const href = `${outputUrl}#${anchor}`;

        const rawAttrs = attrs.replace(/\\"/g, '"');

        return renderTooltipForJson({
            abbr: lookupAbbr,
            full: def.full,
            description: def.description,
            attrs: rawAttrs,
            idAttr,
            inner: innerText,
            linkHref: href,
            linkText,
        });
    });

    return { html: masked.unmask(result), replaced, unmatched, unmatchedSet };
}

const CLIENT_MARKER = 'dl-abbr-occ-client';

function injectAbbrsClientScript(html, lang) {
    if (html.includes(`id="${CLIENT_MARKER}"`)) return html;
    const clientPath = path.join(__dirname, 'abbrs.client.js');
    if (!fs.existsSync(clientPath)) return html;

    const client = fs.readFileSync(clientPath, 'utf8');

    const cfgJson = JSON.stringify({
        visible: ABBR_CONFIG.usageVisibleCount || 5,
        more: lang === 'ru' ? 'ещё' : 'more',
        collapse: lang === 'ru' ? 'свернуть' : 'collapse',
    });

    const bundle = `<script id="${CLIENT_MARKER}">\nwindow.__DL_ABBR_CFG__ = ${cfgJson};\n${client}\n</script>\n`;

    if (html.includes('</body>')) return html.replace('</body>', `${bundle}</body>`);
    return html + bundle;
}

function runGeneration({ buildDir, docsRoot }) {
    const results = { success: [], failed: [] };

    for (const lang of getAbbrLanguages()) {
        const langBuildDir = path.join(buildDir, lang);
        const langDocsDir = path.join(docsRoot, lang);
        if (!fs.existsSync(langBuildDir) || !fs.existsSync(langDocsDir)) continue;

        const dict = loadAbbrDictionary(langDocsDir, lang);
        if (dict.size === 0) {
            console.log(`[abbrTitles] ${lang}: словарь пуст — пропуск.`);
            continue;
        }

        try {
            const htmlFiles = [];
            (function walk(dir) {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const e of entries) {
                    const full = path.join(dir, e.name);
                    if (e.isDirectory()) walk(full);
                    else if (e.name.endsWith('.html')) htmlFiles.push(full);
                }
            })(langBuildDir);

            let totalReplaced = 0;
            let filesChanged = 0;
            let totalUnmatched = 0;
            const allUnmatched = new Set();

            for (const file of htmlFiles) {
                const html = fs.readFileSync(file, 'utf8');
                const res = injectAbbrTitlesIntoHtml(html, dict, lang);
                totalReplaced += res.replaced;
                totalUnmatched += res.unmatched;
                for (const u of res.unmatchedSet) allUnmatched.add(u);

                if (res.html !== html) {
                    fs.writeFileSync(file, res.html, 'utf8');
                    filesChanged++;
                }
            }

            for (const file of htmlFiles) {
                let html = fs.readFileSync(file, 'utf8');
                const next = injectAbbrsClientScript(html, lang);
                if (next !== html) {
                    fs.writeFileSync(file, next, 'utf8');
                }
            }

            if (totalUnmatched > 0) {
                console.warn(
                    `[termTitles] ${lang}: ${totalUnmatched} <abbr class="term"> без определений ` +
                    `в словаре. Не найдены: ${Array.from(allUnmatched).join(', ')}`
                );
            }
            const unmatchedNote = totalUnmatched > 0 ? `; ${totalUnmatched} без определений` : '';

            console.log(
                `[abbrTitles] ${lang}: ${totalReplaced} <abbr> обогащено в ${filesChanged} файлах${unmatchedNote}`
            );
            results.success.push(lang);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`❌ [abbrTitles] ${lang}: ${msg}`);
            results.failed.push(lang);
        }
    }

    return results;
}

module.exports = {
    runGeneration,
    injectAbbrTitlesIntoHtml,
    injectAbbrsClientScript,
    extractDataAbbr,
};