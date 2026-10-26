// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { abbrAnchorId, abbrOccurrenceId, escapeHtml } = require('./abbrs.model.js');
const { renderTemplate } = require('./abbrs.template.js');

/**
 * @param {number} n
 * @param {string} one
 * @param {string} few
 * @param {string} many
 * @returns {string}
 */
function pluralizeRu(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}

/**
 * @param {string} outputDir
 * @param {import('./abbrs.model.js').AbbrMap} abbrMap
 * @param {string} lang
 * @param {{ showWarnings?: boolean, showUnused?: boolean, usageCutTitle?: { ru?: string, en?: string } }} [options]
 */
function writeAbbrsIndex(outputDir, abbrMap, lang, options = {}) {
    const isRu = lang === 'ru';
    const showWarnings = options.showWarnings === true;
    const showUnused = options.showUnused === true;

    const cutTitle =
        options.usageCutTitle && options.usageCutTitle[lang]
            ? options.usageCutTitle[lang]
            : isRu
                ? 'Встречается в'
                : 'Appears in';

    const title = isRu ? 'Список сокращений' : 'Abbreviations';
    const unusedText = isRu ? '_В статьях не используется._' : '_Not used in articles._';
    const noDictWarning = isRu ? '⚠️ Нет в словаре.' : '⚠️ Not in dictionary.';

    const sorted = Object.values(abbrMap).sort((a, b) => a.abbr.localeCompare(b.abbr, lang, { sensitivity: 'base' }));

    /** @type {string[]} */
    const lines = [];

    // frontmatter
    lines.push(renderTemplate('frontmatter.md', { TITLE: title }));
    lines.push('');

    // заголовок страницы
    lines.push(`# ${title}`);
    lines.push('');

    // сводный баннер «нет в словаре» — если включено
    if (showWarnings) {
        const undefinedAbbrs = sorted.filter(a => !a.definedInDictionary);
        if (undefinedAbbrs.length > 0) {
            lines.push(
                isRu
                    ? `> ⚠️ **Нет в словаре:** ${undefinedAbbrs.map(a => a.abbr).join(', ')}.`
                    : `> ⚠️ **Not in dictionary:** ${undefinedAbbrs.map(a => a.abbr).join(', ')}.`
            );
            lines.push('');
        }
    }

    let currentLetter = '';

    for (const entry of sorted) {
        const letter = entry.abbr.charAt(0).toUpperCase();

        if (letter !== currentLetter) {
            if (lines.length > 0 && lines[lines.length - 1] !== '') lines.push('');
            lines.push(renderTemplate('letter.md', { LETTER: letter }));
            lines.push('');
            currentLetter = letter;
        }

        const anchorId = abbrAnchorId(entry.abbr);

        if (entry.definedInDictionary) {
            lines.push(
                renderTemplate('entry.md', {
                    ANCHOR_ID: anchorId,
                    ABBR: escapeHtml(entry.abbr),
                    FULL: entry.full,
                })
            );
        } else {
            lines.push(
                renderTemplate('entry.undefined.md', {
                    ANCHOR_ID: anchorId,
                    ABBR: escapeHtml(entry.abbr),
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
                const occId = abbrOccurrenceId(entry.abbr, i);
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

module.exports = { writeAbbrsIndex };
