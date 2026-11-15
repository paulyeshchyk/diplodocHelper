// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { termAnchorId, termOccurrenceId, escapeHtml } = require('./terms.model.js');
const { renderTemplate } = require('./terms.template.js');

/**
 * Локализация текстовых констант для терминов.
 */
class TermsLocalization {
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
            title: isRu ? 'Список терминов' : 'Terms',
            unusedText: isRu ? '_В статьях не используется._' : '_Not used in articles._',
            noDictWarning: isRu ? '⚠️ Нет в словаре.' : '⚠️ Not in dictionary.',
        };
    }

    /**
     * @param {boolean} isRu
     * @param {Array<{ term: string }>} undefinedTerms
     * @returns {string}
     */
    static formatUndefinedBanner(isRu, undefinedTerms) {
        const list = undefinedTerms.map(a => a.term).join(', ');
        return isRu
            ? `> ⚠️ **Нет в словаре:** ${list}.`
            : `> ⚠️ **Not in dictionary:** ${list}.`;
    }
}

/**
 * Построитель списка вхождений терминов (ссылка на документ + ссылки на параграфы с новой строки).
 */
class TermOccurrenceBuilder {
    /**
     * @param {string} term
     * @param {Array<{ title: string, href: string, occurrences: number }>} pages
     * @param {string} lang
     * @returns {string[]}
     */
    static buildLines(term, pages, lang) {
        const occurrenceLines = [];

        for (const page of pages) {
            const linksHtml = this.buildPageOccurrenceLinks(term, page, lang);

            occurrenceLines.push(
                renderTemplate('occ.line.md', {
                    TITLE: page.title,
                    URL: `../../${page.href}`,
                    // Перенос на новую строку с отступом под ссылкой на документ
                    LINKS: `\n  Вхождения: ${linksHtml}`,
                })
            );
        }

        return occurrenceLines;
    }

    /**
     * @param {string} term
     * @param {{ href: string, occurrences: number }} page
     * @param {string} lang
     * @returns {string}
     */
    static buildPageOccurrenceLinks(term, page, lang) {
        const htmlPath = page.href.replace(/\.md$/i, '.html');
        const occBaseUrl = encodeURI(`/${lang}/${htmlPath}`);

        const occLinks = [];
        for (let i = 1; i <= page.occurrences; i++) {
            const occId = termOccurrenceId(term, i);
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
 * Рендерер отдельных Markdown-блоков страницы терминов.
 */
class TermMarkdownRenderer {
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
        const anchorId = termAnchorId(entry.term);
        const result = [];

        if (entry.definedInDictionary) {
            result.push(
                renderTemplate('entry.md', {
                    ANCHOR_ID: anchorId,
                    TERM: escapeHtml(entry.term),
                    DEFINITION: entry.definition,
                })
            );
        } else {
            result.push(
                renderTemplate('entry.undefined.md', {
                    ANCHOR_ID: anchorId,
                    TERM: escapeHtml(entry.term),
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
 * Запись сгенерированных файлов индекса терминов и оглавления на диск.
 */
class TermsFileStorage {
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
 * Оркестрант генерации страницы списка терминов.
 */
class TermsIndexWriter {
    /**
     * @param {string} outputDir
     * @param {import('./terms.model.js').TermMap} termMap
     * @param {string} lang
     * @param {{ showWarnings?: boolean, showUnused?: boolean, usageCutTitle?: { ru?: string, en?: string } }} [options]
     */
    constructor(outputDir, termMap, lang, options = {}) {
        this.outputDir = outputDir;
        this.termMap = termMap;
        this.lang = lang;
        this.showWarnings = options.showWarnings === true;
        this.showUnused = options.showUnused === true;
        this.labels = TermsLocalization.getLabels(lang, options);
    }

    /**
     * Выполняет полную сборку и запись файлов.
     */
    write() {
        const sortedEntries = this.getSortedEntries();
        const lines = [];

        lines.push(...TermMarkdownRenderer.renderHeader(this.labels.title));

        if (this.showWarnings) {
            const bannerLines = this.buildUndefinedBannerLines(sortedEntries);
            lines.push(...bannerLines);
        }

        lines.push(...this.buildEntriesLines(sortedEntries));

        TermsFileStorage.writeAll(this.outputDir, this.labels.title, lines);
    }

    /**
     * @returns {object[]}
     */
    getSortedEntries() {
        return Object.values(this.termMap).sort((a, b) =>
            a.term.localeCompare(b.term, this.lang, { sensitivity: 'base' })
        );
    }

    /**
     * @param {object[]} sortedEntries
     * @returns {string[]}
     */
    buildUndefinedBannerLines(sortedEntries) {
        const undefinedTerms = sortedEntries.filter(a => !a.definedInDictionary);
        if (undefinedTerms.length === 0) return [];

        return [
            TermsLocalization.formatUndefinedBanner(this.labels.isRu, undefinedTerms),
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
            const letter = entry.term.charAt(0).toUpperCase();

            if (letter !== currentLetter) {
                const needsBlank = lines.length > 0 && lines[lines.length - 1] !== '';
                lines.push(...TermMarkdownRenderer.renderLetterHeading(letter, needsBlank));
                currentLetter = letter;
            }

            lines.push(
                ...TermMarkdownRenderer.renderEntryDefinition(entry, {
                    showWarnings: this.showWarnings,
                    noDictWarning: this.labels.noDictWarning,
                })
            );

            if (entry.rank === 0) {
                if (this.showUnused) {
                    lines.push(...TermMarkdownRenderer.renderUnusedBlock(this.labels.unusedText));
                }
                continue;
            }

            const occurrenceLines = TermOccurrenceBuilder.buildLines(entry.term, entry.pages, this.lang);
            lines.push(...TermMarkdownRenderer.renderOccurrencesCut(this.labels.cutTitle, occurrenceLines));
        }

        return lines;
    }
}

/**
 * Фасад-функция для обратной совместимости с существующими вызовами.
 *
 * @param {string} outputDir
 * @param {import('./terms.model.js').TermMap} termMap
 * @param {string} lang
 * @param {{ showWarnings?: boolean, showUnused?: boolean, usageCutTitle?: { ru?: string, en?: string } }} [options]
 */
function writeTermsIndex(outputDir, termMap, lang, options = {}) {
    const writer = new TermsIndexWriter(outputDir, termMap, lang, options);
    writer.write();
}

module.exports = {
    writeTermsIndex,
    TermsIndexWriter,
    TermsLocalization,
    TermOccurrenceBuilder,
    TermMarkdownRenderer,
    TermsFileStorage,
};