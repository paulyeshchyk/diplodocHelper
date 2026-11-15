// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { abbrAnchorId, abbrOccurrenceId, escapeHtml } = require('./abbrs.model.js');
const { renderTemplate } = require('./abbrs.template.js');

/**
 * Утилиты плюрализации и локализации текстовых констант.
 */
class AbbrsLocalization {
    /**
     * @param {number} n
     * @param {string} one
     * @param {string} few
     * @param {string} many
     * @returns {string}
     */
    static pluralizeRu(n, one, few, many) {
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 === 1 && mod100 !== 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
    }

    /**
     * @param {string} lang
     * @param {{ usageCutTitle?: { ru?: string, en?: string } }} [options]
     */
    static getLabels(lang, options = {}) {
        const isRu = lang === 'ru';
        const cutTitle =
            options.usageCutTitle && options.usageCutTitle[lang]
                ? options.usageCutTitle[lang]
                : isRu
                    ? 'Встречается в'
                    : 'Appears in';

        return {
            isRu,
            cutTitle,
            title: isRu ? 'Список сокращений' : 'Abbreviations',
            unusedText: isRu ? '_В статьях не используется._' : '_Not used in articles._',
            noDictWarning: isRu ? '⚠️ Нет в словаре.' : '⚠️ Not in dictionary.',
        };
    }

    /**
     * @param {boolean} isRu
     * @param {Array<{ abbr: string }>} undefinedAbbrs
     * @returns {string}
     */
    static formatUndefinedBanner(isRu, undefinedAbbrs) {
        const list = undefinedAbbrs.map(a => a.abbr).join(', ');
        return isRu
            ? `> ⚠️ **Нет в словаре:** ${list}.`
            : `> ⚠️ **Not in dictionary:** ${list}.`;
    }
}

/**
 * Построитель списка вхождений (ссылка на документ + ссылки на параграфы с новой строки).
 */
class AbbrOccurrenceBuilder {
    /**
     * @param {string} abbr
     * @param {Array<{ title: string, href: string, occurrences: number }>} pages
     * @param {string} lang
     * @returns {string[]}
     */
    static buildLines(abbr, pages, lang) {
        const occurrenceLines = [];

        for (const page of pages) {
            const linksHtml = this.buildPageOccurrenceLinks(abbr, page, lang);

            occurrenceLines.push(
                renderTemplate('occ.line.md', {
                    TITLE: page.title,
                    URL: `../../${page.href}`,
                    LINKS: `\n Вхождение: ${linksHtml}`,
                })
            );
        }

        return occurrenceLines;
    }

    /**
     * @param {string} abbr
     * @param {{ href: string, occurrences: number }} page
     * @param {string} lang
     * @returns {string}
     */
    static buildPageOccurrenceLinks(abbr, page, lang) {
        const htmlPath = page.href.replace(/\.md$/i, '.html');
        const occBaseUrl = encodeURI(`/${lang}/${htmlPath}`);

        const occLinks = [];
        for (let i = 1; i <= page.occurrences; i++) {
            const occId = abbrOccurrenceId(abbr, i);
            occLinks.push(
                renderTemplate('occ.link.md', {
                    HREF: `${occBaseUrl}#${occId}`,
                    N: String(i),
                })
            );
        }

        return renderTemplate('occ.list.md', { LINKS: occLinks.join('') });
    }
}

/**
 * Рендерер отдельных Markdown-блоков страницы сокращений.
 */
class AbbrMarkdownRenderer {
    /**
     * @param {string} title
     * @returns {string[]}
     */
    static renderHeader(title) {
        return [
            renderTemplate('frontmatter.md', { TITLE: title }),
            '',
            `# ${title}`,
            '',
        ];
    }

    /**
     * @param {string} letter
     * @param {boolean} needsLeadingBlankLine
     * @returns {string[]}
     */
    static renderLetterHeading(letter, needsLeadingBlankLine) {
        const result = [];
        if (needsLeadingBlankLine) {
            result.push('');
        }
        result.push(renderTemplate('letter.md', { LETTER: letter }), '');
        return result;
    }

    /**
     * @param {object} entry
     * @param {{ showWarnings: boolean, noDictWarning: string }} config
     * @returns {string[]}
     */
    static renderEntryDefinition(entry, { showWarnings, noDictWarning }) {
        const anchorId = abbrAnchorId(entry.abbr);
        const result = [];

        if (entry.definedInDictionary) {
            result.push(
                renderTemplate('entry.md', {
                    ANCHOR_ID: anchorId,
                    ABBR: escapeHtml(entry.abbr),
                    FULL: entry.full,
                })
            );
        } else {
            result.push(
                renderTemplate('entry.undefined.md', {
                    ANCHOR_ID: anchorId,
                    ABBR: escapeHtml(entry.abbr),
                })
            );
            if (showWarnings) {
                result.push('', renderTemplate('entry.warning.md', { TEXT: noDictWarning }));
            }
        }

        result.push('');
        return result;
    }

    /**
     * @param {string} unusedText
     * @returns {string[]}
     */
    static renderUnusedBlock(unusedText) {
        return [
            renderTemplate('unused.md', { TEXT: unusedText }),
            '',
        ];
    }

    /**
     * @param {string} cutTitle
     * @param {string[]} occurrenceLines
     * @returns {string[]}
     */
    static renderOccurrencesCut(cutTitle, occurrenceLines) {
        return [
            renderTemplate('cut.md', {
                TITLE: cutTitle,
                CONTENT: occurrenceLines.join('\n'),
            }),
            '',
        ];
    }
}

/**
 * Запись сгенерированных файлов индекса и оглавления на диск.
 */
class AbbrsFileStorage {
    /**
     * @param {string} outputDir
     * @param {string} title
     * @param {string[]} lines
     */
    static writeAll(outputDir, title, lines) {
        const indexContent = lines.join('\n').trim() + '\n';
        fs.writeFileSync(path.join(outputDir, 'index.md'), indexContent, 'utf8');
        fs.writeFileSync(path.join(outputDir, 'toc.yaml'), `title: ${title}\nhref: index.md\n`, 'utf8');
        fs.writeFileSync(path.join(outputDir, 'index.yaml'), `title: ${title}\nhref: index.html\n`, 'utf8');
    }
}

/**
 * Оркестрант генерации страницы списка сокращений.
 */
class AbbrsIndexWriter {
    /**
     * @param {string} outputDir
     * @param {import('./abbrs.model.js').AbbrMap} abbrMap
     * @param {string} lang
     * @param {{ showWarnings?: boolean, showUnused?: boolean, usageCutTitle?: { ru?: string, en?: string } }} [options]
     */
    constructor(outputDir, abbrMap, lang, options = {}) {
        this.outputDir = outputDir;
        this.abbrMap = abbrMap;
        this.lang = lang;
        this.showWarnings = options.showWarnings === true;
        this.showUnused = options.showUnused === true;
        this.labels = AbbrsLocalization.getLabels(lang, options);
    }

    /**
     * Выполняет полную сборку и запись файлов.
     */
    write() {
        const sortedEntries = this.getSortedEntries();
        const lines = [];

        lines.push(...AbbrMarkdownRenderer.renderHeader(this.labels.title));

        if (this.showWarnings) {
            const bannerLines = this.buildUndefinedBannerLines(sortedEntries);
            lines.push(...bannerLines);
        }

        lines.push(...this.buildEntriesLines(sortedEntries));

        AbbrsFileStorage.writeAll(this.outputDir, this.labels.title, lines);
    }

    /**
     * @returns {object[]}
     */
    getSortedEntries() {
        return Object.values(this.abbrMap).sort((a, b) =>
            a.abbr.localeCompare(b.abbr, this.lang, { sensitivity: 'base' })
        );
    }

    /**
     * @param {object[]} sortedEntries
     * @returns {string[]}
     */
    buildUndefinedBannerLines(sortedEntries) {
        const undefinedAbbrs = sortedEntries.filter(a => !a.definedInDictionary);
        if (undefinedAbbrs.length === 0) return [];

        return [
            AbbrsLocalization.formatUndefinedBanner(this.labels.isRu, undefinedAbbrs),
            '',
        ];
    }

    /**
     * @param {object[]} sortedEntries
     * @returns {string[]}
     */
    buildEntriesLines(sortedEntries) {
        const lines = [];
        let currentLetter = '';

        for (const entry of sortedEntries) {
            const letter = entry.abbr.charAt(0).toUpperCase();

            if (letter !== currentLetter) {
                const needsBlank = lines.length > 0 && lines[lines.length - 1] !== '';
                lines.push(...AbbrMarkdownRenderer.renderLetterHeading(letter, needsBlank));
                currentLetter = letter;
            }

            lines.push(
                ...AbbrMarkdownRenderer.renderEntryDefinition(entry, {
                    showWarnings: this.showWarnings,
                    noDictWarning: this.labels.noDictWarning,
                })
            );

            if (entry.rank === 0) {
                if (this.showUnused) {
                    lines.push(...AbbrMarkdownRenderer.renderUnusedBlock(this.labels.unusedText));
                }
                continue;
            }

            const occurrenceLines = AbbrOccurrenceBuilder.buildLines(entry.abbr, entry.pages, this.lang);
            lines.push(...AbbrMarkdownRenderer.renderOccurrencesCut(this.labels.cutTitle, occurrenceLines));
        }

        return lines;
    }
}

/**
 * Фасад-функция для обратной совместимости с существующими вызовами.
 *
 * @param {string} outputDir
 * @param {import('./abbrs.model.js').AbbrMap} abbrMap
 * @param {string} lang
 * @param {{ showWarnings?: boolean, showUnused?: boolean, usageCutTitle?: { ru?: string, en?: string } }} [options]
 */
function writeAbbrsIndex(outputDir, abbrMap, lang, options = {}) {
    const writer = new AbbrsIndexWriter(outputDir, abbrMap, lang, options);
    writer.write();
}

module.exports = {
    writeAbbrsIndex,
    AbbrsIndexWriter,
    AbbrsLocalization,
    AbbrOccurrenceBuilder,
    AbbrMarkdownRenderer,
    AbbrsFileStorage,
};