const { translate, nls_ts } = require('../nls_ts');
const { truncateMiddle } = require('../plugins/shared/extractors/stringExtractor');

/** @import {Reference} from '../plugins/shared/services/files/diplodoc-helper.files.js' */

class MessageBuilder {
    /**
     * @returns {string}
     */
    introduction() {
        throw new Error('Not implemented');
    }
    /**
     * @param {number} count
     * @returns {string}
     */
    header(count) {
        throw new Error('Not implemented');
    }

    /**
     * @returns {string}
     */
    footer() {
        throw new Error('Not implemented');
    }
    /**
     * @returns {string}
     */
    noReferencesMessage() {
        throw new Error('Not implemented');
    }
    /**
     * @param {number} count
     * @returns {string}
     */
    linkCount(count) {
        throw new Error('Not implemented');
    }
    /**
     * @param {number} count
     * @returns {string}
     */
    andMore(count) {
        throw new Error('Not implemented');
    }

    /**
     * Строит итоговое сообщение на основе переданных ссылок.
     * @param {Reference[]} references
     * @param {number} [maxCount=12]
     * @returns {string}
     */
    build(references, maxCount = 12) {
        let message = this.introduction();

        if (references.length > 0) {
            const headerText = this.header(references.length);
            if (headerText) message += '\n' + headerText;

            message += this.referenceListSlice(references, maxCount);

            const footerText = this.footer();
            if (footerText) message += '\n' + footerText;
        } else {
            message += '\n' + this.noReferencesMessage();
        }

        return message;
    }

    /**
     * @param {Array<Reference>} references
     * @param {number} maxCount
     * @returns {string}
     */
    referenceListSlice(references, maxCount) {
        if (maxCount <= 0 || references.length === 0) return '';

        const lineMaxLength = 59;
        const lines = [];
        for (const ref of references.slice(0, maxCount)) {
            const pathStr = String(ref.relativePath);
            const cleanedPath = pathStr.replace(/[/\\]index\.md$/i, '');
            const displayPath = truncateMiddle(cleanedPath, lineMaxLength);
            const countText = this.linkCount(ref.linkCount);
            lines.push(`- ${displayPath} ${countText}`);
        }

        if (references.length > maxCount) {
            const remaining = references.length - maxCount;
            lines.push(this.andMore(remaining));
        }

        return '\n' + lines.join('\n');
    }
}

class SectionDeleteMessageBuilder extends MessageBuilder {
    /**
     * @param {string} folderName
     */
    constructor(folderName) {
        super();
        this.folderName = folderName;
    }

    introduction() {
        return translate(nls_ts.plugin.section.delete.confirmation.text, this.folderName);
    }

    /**
     * @param {string | number | boolean} count
     */
    header(count) {
        return count === 0
            ? ''
            : count === 1
              ? translate(nls_ts.crossref.plural.file.message, count)
              : translate(nls_ts.crossref.few.files.message, count);
    }

    footer() {
        return translate(nls_ts.crossref.footer.message);
    }

    noReferencesMessage() {
        return translate(nls_ts.crossref.none.reference.message);
    }

    /**
     * @param {number} count
     */
    linkCount(count) {
        return count > 1
            ? translate(nls_ts.crossref.few.links.message, count)
            : translate(nls_ts.crossref.plural.links.message, count);
    }

    /**
     * @param {number} count
     */
    andMore(count) {
        return translate(nls_ts.crossref.more.files.message, count);
    }
}

class FileDeleteMessageBuilder extends MessageBuilder {
    /**
     * @param {boolean} isDirectory - true если удаляется папка, иначе файл
     * @param {string} targetName - имя файла или папки
     */
    constructor(isDirectory, targetName) {
        super();
        this.isDirectory = isDirectory;
        this.targetName = targetName;
    }

    introduction() {
        if (this.isDirectory) {
            return translate(nls_ts.plugin.section.delete.confirmation.text, this.targetName);
        }
        return translate(nls_ts.crossref.plural.file.confirm.header, this.targetName);
    }

    /**
     * @param {number} count
     */
    header(count) {
        // Та же логика, что и у SectionDeleteMessageBuilder – можно вынести в общий утилитный метод
        return count === 0
            ? ''
            : count === 1
              ? translate(nls_ts.crossref.plural.file.message, count)
              : translate(nls_ts.crossref.few.files.message, count);
    }

    footer() {
        return '';
    }

    noReferencesMessage() {
        return 'Ссылок на этот объект не найдено.';
    }

    /**
     * @param {number} count
     */
    linkCount(count) {
        return count > 1
            ? translate(nls_ts.crossref.few.links.message, count)
            : translate(nls_ts.crossref.plural.links.message, count);
    }

    /**
     * @param {number} count
     */
    andMore(count) {
        return translate(nls_ts.crossref.more.files.message, count);
    }
}

module.exports = { MessageBuilder, SectionDeleteMessageBuilder, FileDeleteMessageBuilder };
