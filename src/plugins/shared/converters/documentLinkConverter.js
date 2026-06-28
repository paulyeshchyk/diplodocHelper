const { isCursorInsideHtmlTagGlobal, isCursorInsideHtmlTag } = require('../validators/htmlTagValidator');
const { buildClipboardLink } = require('../builders/clipboardLinkBuilder');
const { buildLink } = require('../builders/link/documentLinkBuilder');
const { buildRelativePath } = require('../builders/relativePathAnchorBuilder');
const { translate } = require('../../../nls_ts');
const { getFileTypeInfo } = require('../../utils/file.utils');

/**
 * @param {string} clipboardText
 * @param {string} sourceFilePath
 * @param {{line: number;character: number;}} position
 * @param {string} lineText
 * @param {function({label: string, anchor: string}[]): Promise<string|undefined>} callbackForPromptAnchorSelection
 * @param {string} [projectRoot]   // новый параметр
 * @param {string} [documentTextBefore]
 * @returns {Promise<string>}
 */
async function ConvertDocumentPathToLink(
    clipboardText,
    sourceFilePath,
    position,
    lineText,
    callbackForPromptAnchorSelection,
    projectRoot,
    documentTextBefore
) {
    const clipboardData = buildClipboardLink(clipboardText);
    if (!clipboardData?.sourceLinkPath || !clipboardData?.sourceLinkName) {
        throw new Error(translate('plugin.link.paste.error.emptybuffer'));
    }

    const shouldRenderAsHtml = documentTextBefore
        ? isCursorInsideHtmlTagGlobal(documentTextBefore)
        : isCursorInsideHtmlTag(position, lineText);

    const targetFilePath = clipboardData.sourceLinkPath;
    const { isDirectory, isImage } = await getFileTypeInfo(targetFilePath);
    const { addIndex, prefix } = getLinkOptions(targetFilePath, isDirectory);

    let documentRelativePath = await buildRelativePath(
        sourceFilePath,
        targetFilePath,
        addIndex,
        isImage,
        isDirectory,
        callbackForPromptAnchorSelection,
        shouldRenderAsHtml,
        projectRoot
    );

    return buildLink(isImage, shouldRenderAsHtml, clipboardData, documentRelativePath, prefix);
}

/**
 * Определяет, нужно ли добавлять index.md и какой префикс использовать
 * @param {string} targetFilePath
 * @param {boolean} isDirectory
 * @returns {{addIndex: boolean, prefix: string}}
 */
function getLinkOptions(targetFilePath, isDirectory) {
    if (isDirectory) {
        return { addIndex: true, prefix: '' };
    }
    if (targetFilePath.endsWith('.md')) {
        return { addIndex: false, prefix: '' };
    }
    return { addIndex: false, prefix: '!' };
}

module.exports = { ConvertDocumentPathToLink };
