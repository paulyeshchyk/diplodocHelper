const fs = require('fs');
const path = require('path');
const { getTitleFromMetadata } = require('../utils/frontmatter.utils');
const { maskCodeInMarkdown } = require('./shared');

/**
 * @param {string} attrs
 */
function extractDataTerm(attrs) {
    const m = attrs.match(/\bdata-term\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!m) return '';
    return (m[1] !== undefined ? m[1] : m[2] || '').trim();
}

/**
 * @param {string} fullPath
 * @param {string} langDir
 * @returns {{ title: string, href: string, occurrences: Map<string, number> } | null}
 */
function extractTermsFromFile(fullPath, langDir) {
    const raw = fs.readFileSync(fullPath, 'utf8');
    const content = maskCodeInMarkdown(raw);

    const occurrences = new Map();
    const re = /<abbr\b([^>]*)>([^<]+)<\/abbr>/gi;
    let m;
    while ((m = re.exec(content)) !== null) {
        const attrs = m[1];
        if (!/\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["']/.test(attrs)) continue;

        const innerText = m[2].trim();
        if (!innerText) continue;

        const dataTerm = extractDataTerm(attrs);
        const term = dataTerm || innerText;
        occurrences.set(term, (occurrences.get(term) || 0) + 1);
    }

    if (occurrences.size === 0) return null;

    const href = path.relative(langDir, fullPath).replace(/\\/g, '/');
    const title = getTitleFromMetadata(fullPath) || path.basename(path.dirname(fullPath));

    return { title, href, occurrences };
}

module.exports = { extractTermsFromFile, extractDataTerm };
