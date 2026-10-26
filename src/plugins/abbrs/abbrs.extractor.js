const { maskCodeInMarkdown } = require('./shared');
const { getTitleFromMetadata } = require('../utils/frontmatter.utils');
const fs = require('fs');
const path = require('path');

/**
 * @param {string} attrs
 */
function extractDataAbbr(attrs) {
    const m = attrs.match(/\bdata-abbr\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!m) return '';
    return (m[1] !== undefined ? m[1] : m[2] || '').trim();
}

/**
 * @param {string} fullPath
 * @param {any} langDir
 */
function extractAbbrsFromFile(fullPath, langDir) {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const content = maskCodeInMarkdown(raw);

    const occurrences = new Map();
    const re = /<abbr(\b[^>]*)>([^<]+)<\/abbr>/gi;
    let m;
    while ((m = re.exec(content)) !== null) {
        if (/\bclass\s*=/.test(m[1])) continue; // <abbr class="…"> — чужое

        const innerText = m[2].trim();
        if (!innerText) continue;

        const dataAbbr = extractDataAbbr(m[1]);
        const key = dataAbbr || innerText; // lookup-ключ
        occurrences.set(key, (occurrences.get(key) || 0) + 1);
    }

    if (occurrences.size === 0) return null;

    const href = path.relative(langDir, fullPath).replace(/\\/g, '/');
    const title = getTitleFromMetadata(fullPath) || path.basename(path.dirname(fullPath));
    return { title, href, occurrences };
}

module.exports = { extractAbbrsFromFile, extractDataAbbr };
