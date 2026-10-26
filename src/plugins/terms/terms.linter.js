// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { loadTermDictionary } = require('./terms.dictionary');
const { getTermOutputDir } = require('./terms.paths');

const SKIP_DIRS = new Set(['terms', 'abbrs', 'contexts', 'helptags', 'figures', 'roadmap', 'node_modules']);

function offsetToPosition(text, offset) {
  const before = text.slice(0, offset);
  const lines = before.split('\n');
  return {
    line: lines.length - 1,
    character: lines[lines.length - 1].length,
  };
}

/**
 * @param {string} attrs — строка атрибутов (без `<abbr` и `>`)
 * @returns {string} значение data-term или '' если нет
 */
function extractDataTerm(attrs) {
  const m = attrs.match(/\bdata-term\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  if (!m) return '';
  return (m[1] !== undefined ? m[1] : m[2] || '').trim();
}

function lintLang(langDir, lang) {
  const issues = [];
  const dictionary = loadTermDictionary(langDir, lang);

  let skipFullPaths;
  try {
    skipFullPaths = new Set([path.resolve(getTermOutputDir(langDir, lang))]);
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

    // inline-override через title= не считается «не определённым»
    const re = /<abbr(\b[^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*)>([^<]+)<\/abbr>/gi;
    let m;
    while ((m = re.exec(content)) !== null) {
      const attrs = m[1];
      const innerText = m[2].trim();
      if (!innerText) continue;

      if (/\btitle\s*=/i.test(attrs)) continue;

      const dataTerm = extractDataTerm(attrs);
      const lookupTerm = dataTerm || innerText;
      if (dictionary.has(lookupTerm)) continue;

      const pos = offsetToPosition(content, m.index);
      issues.push({
        filePath: fullPath,
        line: pos.line,
        character: pos.character,
        term: lookupTerm,
        innerText,  // полезно в отчётах: видно, что именно обёрнуто
        lang,
      });
    }
  }

  walk(langDir);
  return issues;
}

function lintTerms(docsRoot, options = {}) {
  const languages = options.languages || ['ru', 'en'];
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

module.exports = { lintTerms, extractDataTerm };