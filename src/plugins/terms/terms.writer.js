// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { termAnchorId, termOccurrenceId, escapeHtml } = require('./terms.model.js');
const { renderTemplate } = require('./terms.template.js');

function writeTermsIndex(outputDir, termMap, lang, options = {}) {
  const isRu = lang === 'ru';
  const showWarnings = options.showWarnings === true;
  const showUnused = options.showUnused === true;

  const cutTitle =
    options.usageCutTitle && options.usageCutTitle[lang]
      ? options.usageCutTitle[lang]
      : isRu
        ? 'Встречается в'
        : 'Appears in';

  const title = isRu ? 'Список терминов' : 'Terms';
  const unusedText = isRu ? '_В статьях не используется._' : '_Not used in articles._';
  const noDictWarning = isRu ? '⚠️ Нет в словаре.' : '⚠️ Not in dictionary.';

  const sorted = Object.values(termMap).sort((a, b) => a.term.localeCompare(b.term, lang, { sensitivity: 'base' }));

  const lines = [];

  lines.push(renderTemplate('frontmatter.md', { TITLE: title }));
  lines.push('');

  lines.push(`# ${title}`);
  lines.push('');

  if (showWarnings) {
    const undefinedTerms = sorted.filter(a => !a.definedInDictionary);
    if (undefinedTerms.length > 0) {
      lines.push(
        isRu
          ? `> ⚠️ **Нет в словаре:** ${undefinedTerms.map(a => a.term).join(', ')}.`
          : `> ⚠️ **Not in dictionary:** ${undefinedTerms.map(a => a.term).join(', ')}.`
      );
      lines.push('');
    }
  }

  let currentLetter = '';

  for (const entry of sorted) {
    const letter = entry.term.charAt(0).toUpperCase();

    if (letter !== currentLetter) {
      if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('');
      lines.push(renderTemplate('letter.md', { LETTER: letter }));
      lines.push('');
      currentLetter = letter;
    }

    const anchorId = termAnchorId(entry.term);

    if (entry.definedInDictionary) {
      lines.push(
        renderTemplate('entry.md', {
          ANCHOR_ID: anchorId,
          TERM: escapeHtml(entry.term),
          DEFINITION: escapeHtml(entry.definition),
        })
      );
    } else {
      lines.push(
        renderTemplate('entry.undefined.md', {
          ANCHOR_ID: anchorId,
          TERM: escapeHtml(entry.term),
        })
      );
      if (showWarnings) {
        lines.push('');
        lines.push(renderTemplate('entry.warning.md', { TEXT: noDictWarning }));
      }
    }
    lines.push('');

    if (entry.rank === 0) {
      if (showUnused) {
        lines.push(renderTemplate('unused.md', { TEXT: unusedText }));
        lines.push('');
      }
      continue;
    }

    const occurrenceLines = [];
    for (const page of entry.pages) {
      const htmlPath = page.href.replace(/\.md$/i, '.html');
      const occBaseUrl = encodeURI(`/${lang}/${htmlPath}`);

      const occLinks = [];
      for (let i = 1; i <= page.occurrences; i++) {
        const occId = termOccurrenceId(entry.term, i);
        occLinks.push(
          renderTemplate('occ.link.md', {
            HREF: `${occBaseUrl}#${occId}`,
            N: String(i),
          })
        );
      }
      const linksHtml = renderTemplate('occ.list.md', { LINKS: occLinks.join('') });

      occurrenceLines.push(
        renderTemplate('occ.line.md', {
          TITLE: page.title,
          URL: `../${page.href}`,
          LINKS: linksHtml,
        })
      );
    }

    lines.push(
      renderTemplate('cut.md', {
        TITLE: cutTitle,
        CONTENT: occurrenceLines.join('\n'),
      })
    );
    lines.push('');
  }

  fs.writeFileSync(path.join(outputDir, 'index.md'), lines.join('\n').trim() + '\n', 'utf8');
  fs.writeFileSync(path.join(outputDir, 'toc.yaml'), `title: ${title}\nhref: index.md\n`, 'utf8');
  fs.writeFileSync(path.join(outputDir, 'index.yaml'), `title: ${title}\nhref: index.html\n`, 'utf8');
}

module.exports = { writeTermsIndex };