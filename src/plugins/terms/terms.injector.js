// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { loadTermDictionary } = require('./terms.dictionary');
const { renderTemplate } = require('./terms.template.js');
const TERM_CONFIG = require('./terms.config.js');
const { getTermOutputUrl, getTermLanguages } = require('./terms.paths');
const { maskCodeBlocks } = require('./shared');

const { termAnchorId, termOccurrenceId, escapeHtml, jsonEscapeHtmlForDiplodoc } = require('./terms.model');

function isInsideAnchor(html, matchIndex) {
  const before = html.substring(0, matchIndex);
  return before.lastIndexOf('<a ') > before.lastIndexOf('</a>');
}

/**
 * Извлекает значение data-term из набора атрибутов.
 * @param {string} attrs
 * @param {boolean} [jsonEscaped] — true для JSON-escaped версии (`\"`)
 * @returns {string} пустая строка, если атрибута нет
 */
function extractDataTerm(attrs, jsonEscaped = false) {
  const re = jsonEscaped
    ? /\bdata-term\s*=\s*\\"([^\\"]*)\\"/i
    : /\bdata-term\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
  const m = attrs.match(re);
  if (!m) return '';
  const raw = m[1] !== undefined ? m[1] : m[2];
  return (raw || '').trim();
}

function renderTooltipHtml(p) {
  let content = renderTemplate('tooltip.title.html', {
    TERM: escapeHtml(p.term),
    DEFINITION: escapeHtml(p.definition),
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
    ARIA_LABEL: escapeHtml(p.definition),
    INNER: escapeHtml(p.inner),
    CONTENT: content,
  });
}

function renderTooltipForJson(p) {
  return jsonEscapeHtmlForDiplodoc(renderTooltipHtml(p));
}

function injectTermTitlesIntoHtml(html, dictionary, lang) {
  const masked = maskCodeBlocks(html);
  const linkText = lang === 'ru' ? 'см. Термины' : 'see Terms';
  const outputUrl = getTermOutputUrl(lang);

  let replaced = 0;
  let unmatched = 0;
  const unmatchedSet = new Set();
  // Ключ счётчика — канонический термин (data-term или inner).
  const occurrences = new Map();

  // ---- Ветка 1: raw HTML ----
  let result = masked.masked.replace(
    /<abbr(\b[^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*)>([^<]+)<\/abbr>/gi,
    (match, attrs, inner, offset, full) => {
      const innerText = inner.trim();
      if (!innerText) return match;

      const dataTerm = extractDataTerm(attrs, false);
      const lookupTerm = dataTerm || innerText;

      const hasId = /\bid\s*=/.test(attrs);
      const def = dictionary.get(lookupTerm);

      // inline-override через title=: браузер сам покажет native tooltip
      if (/\btitle\s*=/.test(attrs)) {
        if (hasId) return match;
        const n = (occurrences.get(lookupTerm) || 0) + 1;
        occurrences.set(lookupTerm, n);
        return `<abbr${attrs} id="${termOccurrenceId(lookupTerm, n)}">${inner}</abbr>`;
      }

      if (!def) {
        unmatched++;
        unmatchedSet.add(lookupTerm);
        if (hasId) return match;
        const n = (occurrences.get(lookupTerm) || 0) + 1;
        occurrences.set(lookupTerm, n);
        return `<abbr${attrs} id="${termOccurrenceId(lookupTerm, n)}">${inner}</abbr>`;
      }

      replaced++;
      const n = (occurrences.get(lookupTerm) || 0) + 1;
      occurrences.set(lookupTerm, n);

      const occId = termOccurrenceId(lookupTerm, n);
      const idAttr = hasId ? '' : ` id="${occId}"`;
      const anchor = termAnchorId(lookupTerm);
      const href = `${outputUrl}#${anchor}`;
      const skipLink = isInsideAnchor(full, offset);

      return renderTooltipHtml({
        term: lookupTerm,          // канонический термин — в tooltip title и в href
        definition: def.definition,
        description: def.description,
        attrs,                     // сохраняем class, data-term, id — как есть
        idAttr,
        inner: innerText,          // видимый текст не меняем
        linkHref: skipLink ? undefined : href,
        linkText,
      });
    }
  );

  // ---- Ветка 2: JSON-escaped HTML (&lt;abbr class=\"term\"&gt;…) ----
  result = result.replace(
    /&lt;abbr(\b[^&]*?\bclass=\\"[^\\"]*\bterm\b[^\\"]*\\"[^&]*?)&gt;([^&]+)&lt;\/abbr&gt;/gi,
    (match, attrs, inner) => {
      const innerText = inner.trim();
      if (!innerText) return match;

      const dataTerm = extractDataTerm(attrs, true);
      const lookupTerm = dataTerm || innerText;

      const hasId = /\bid\s*=/.test(attrs);
      const def = dictionary.get(lookupTerm);

      if (/\btitle\s*=/.test(attrs)) {
        if (hasId) return match;
        const n = (occurrences.get(lookupTerm) || 0) + 1;
        occurrences.set(lookupTerm, n);
        return `&lt;abbr${attrs} id=\\"${termOccurrenceId(lookupTerm, n)}\\"&gt;${inner}&lt;/abbr&gt;`;
      }

      if (!def) {
        unmatched++;
        unmatchedSet.add(lookupTerm);
        if (hasId) return match;
        const n = (occurrences.get(lookupTerm) || 0) + 1;
        occurrences.set(lookupTerm, n);
        return `&lt;abbr${attrs} id=\\"${termOccurrenceId(lookupTerm, n)}\\"&gt;${inner}&lt;/abbr&gt;`;
      }

      replaced++;
      const n = (occurrences.get(lookupTerm) || 0) + 1;
      occurrences.set(lookupTerm, n);

      const occId = termOccurrenceId(lookupTerm, n);
      const idAttr = hasId ? '' : ` id="${occId}"`;
      const anchor = termAnchorId(lookupTerm);
      const href = `${outputUrl}#${anchor}`;

      const rawAttrs = attrs.replace(/\\"/g, '"');

      return renderTooltipForJson({
        term: lookupTerm,
        definition: def.definition,
        description: def.description,
        attrs: rawAttrs,
        idAttr,
        inner: innerText,
        linkHref: href,
        linkText,
      });
    }
  );

  return { html: masked.unmask(result), replaced, unmatched, unmatchedSet };
}

const CLIENT_MARKER = 'dl-term-occ-client';

function injectTermsClientScript(html, lang) {
  if (html.includes(`id="${CLIENT_MARKER}"`)) return html;
  const clientPath = path.join(__dirname, 'terms.client.js');
  if (!fs.existsSync(clientPath)) return html;

  const client = fs.readFileSync(clientPath, 'utf8');

  const cfgJson = JSON.stringify({
    visible: TERM_CONFIG.usageVisibleCount || 5,
    more: lang === 'ru' ? 'ещё' : 'more',
    collapse: lang === 'ru' ? 'свернуть' : 'collapse',
  });

  const bundle = `<script id="${CLIENT_MARKER}">\nwindow.__DL_TERM_CFG__ = ${cfgJson};\n${client}\n</script>\n`;

  if (html.includes('</body>')) return html.replace('</body>', `${bundle}</body>`);
  return html + bundle;
}

function runGeneration({ buildDir, docsRoot }) {
  const results = { success: [], failed: [] };

  for (const lang of getTermLanguages()) {
    const langBuildDir = path.join(buildDir, lang);
    const langDocsDir = path.join(docsRoot, lang);
    if (!fs.existsSync(langBuildDir) || !fs.existsSync(langDocsDir)) continue;

    const dict = loadTermDictionary(langDocsDir, lang);
    if (dict.size === 0) {
      console.log(`[termTitles] ${lang}: словарь пуст — пропуск.`);
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
        const res = injectTermTitlesIntoHtml(html, dict, lang);
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
        const next = injectTermsClientScript(html, lang);
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
        `[termTitles] ${lang}: ${totalReplaced} <abbr class="term"> обогащено в ${filesChanged} файлах${unmatchedNote}`
      );
      results.success.push(lang);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌ [termTitles] ${lang}: ${msg}`);
      results.failed.push(lang);
    }
  }

  return results;
}

module.exports = {
  runGeneration,
  injectTermTitlesIntoHtml,
  injectTermsClientScript,
  extractDataTerm,
};