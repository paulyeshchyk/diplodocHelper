// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { loadAbbrDictionary } = require('./abbrs.dictionary');
const { getAbbrOutputDir } = require('./abbrs.paths');

// Служебные папки с генерируемым контентом — не проверяем
const SKIP_DIRS = new Set(['abbrs', 'terms', 'contexts', 'helptags', 'figures', 'roadmap', 'node_modules']);

/**
 * @typedef {Object} AbbrLintIssue
 * @property {string} filePath
 * @property {number} line
 * @property {number} character
 * @property {string} abbr       — канонический ключ (data-abbr или inner)
 * @property {string} innerText  — что реально видно в тексте
 * @property {string} lang
 */

function offsetToPosition(text, offset) {
    const before = text.slice(0, offset);
    const lines = before.split('\n');
    return {
        line: lines.length - 1,
        character: lines[lines.length - 1].length,
    };
}

/**
 * @param {string} attrs
 * @returns {string} значение data-abbr или ''
 */
function extractDataAbbr(attrs) {
    const m = attrs.match(/\bdata-abbr\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!m) return '';
    return (m[1] !== undefined ? m[1] : m[2] || '').trim();
}

function lintLang(langDir, lang) {
    /** @type {AbbrLintIssue[]} */
    const issues = [];
    const dictionary = loadAbbrDictionary(langDir, lang);

    // Папка со сгенерированным index.md — её проверять нельзя,
    // там свои <abbr data-abbr>, которые попадут в ложные срабатывания.
    let skipFullPaths;
    try {
        skipFullPaths = new Set([path.resolve(getAbbrOutputDir(langDir, lang))]);
    } catch (err) {
        console.warn(err instanceof Error ? err.message : String(err));
        skipFullPaths = new Set();
    }

    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue;
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                if (skipFullPaths.has(path.resolve(fullPath))) continue;
                if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('_')) {
                    walk(fullPath);
                }
            } else if (entry.name.endsWith('.md')) {
                lintFile(fullPath);
            }
        }
    }

    function lintFile(fullPath) {
        let content;
        try {
            content = fs.readFileSync(fullPath, 'utf8');
        } catch {
            return;
        }

        const re = /<abbr(\b[^>]*)>([^<]+)<\/abbr>/gi;
        let m;
        while ((m = re.exec(content)) !== null) {
            const attrs = m[1];
            if (/\bclass\s*=/.test(attrs)) continue;   // <abbr class="…"> — чужое
            if (/\btitle\s*=/i.test(attrs)) continue;  // inline-override через title=

            const innerText = m[2].trim();
            if (!innerText) continue;

            const dataAbbr = extractDataAbbr(attrs);
            const lookupAbbr = dataAbbr || innerText;
            if (dictionary.has(lookupAbbr)) continue;

            const pos = offsetToPosition(content, m.index);
            issues.push({
                filePath: fullPath,
                line: pos.line,
                character: pos.character,
                abbr: lookupAbbr,     // что искали в словаре
                innerText,            // что реально обёрнуто — полезно в отчёте
                lang,
            });
        }
    }

    walk(langDir);
    return issues;
}

function lintAbbrs(docsRoot, options = {}) {
    const languages = options.languages || ['ru', 'en'];
    /** @type {AbbrLintIssue[]} */
    const all = [];

    for (const lang of languages) {
        const langDir = path.join(docsRoot, lang);
        if (!fs.existsSync(langDir)) continue;
        all.push(...lintLang(langDir, lang));
    }

    all.sort((a, b) => {
        if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath);
        if (a.line !== b.line) return a.line - b.line;
        return a.character - b.character;
    });

    return all;
}

module.exports = { lintAbbrs, extractDataAbbr };