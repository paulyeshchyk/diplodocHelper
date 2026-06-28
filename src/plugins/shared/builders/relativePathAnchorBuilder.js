const { extractAnchorsFromMdFile } = require('../extractors/anchorExtractor');
const { buildAbsolutePath } = require('./absolutePathBuilder');
const { getTargetMdFile } = require('./mdPathBuilder');
const { buildMdRelativePath } = require('./mdRelativePathBuilder');

/**
 * @param {string} targetFilePath
 * @param {boolean} isDirectory
 * @param {string} documentRelativePath
 * @param {function({label: string, anchor: string}[]): Promise<string|undefined>} callbackForPromptAnchorSelection
 * @returns {Promise<string>}
 */
async function buildMdAnchorRelativePath(
    targetFilePath,
    isDirectory,
    documentRelativePath,
    callbackForPromptAnchorSelection
) {
    // Предлагаем выбор якоря только для MD-документов или папок с index.md (не для изображений)
    const targetMdFile = getTargetMdFile(targetFilePath, isDirectory);
    if (!targetMdFile) {
        return documentRelativePath;
    }
    const anchors = await extractAnchorsFromMdFile(targetMdFile);
    if (anchors.length === 0) {
        return documentRelativePath;
    }
    const selectedAnchor = await callbackForPromptAnchorSelection(anchors);
    if (selectedAnchor) {
        documentRelativePath += `#${selectedAnchor}`;
    }

    return documentRelativePath;
}

/**
 * @param {string} sourceFilePath
 * @param {string} targetFilePath
 * @param {boolean} addIndex
 * @param {boolean} isImage
 * @param {boolean} isDirectory
 * @param {function({label: string, anchor: string}[]): Promise<string|undefined>} callbackForPromptAnchorSelection
 * @param {boolean} [useAbsolutePath]   // новый флаг
 * @param {string} [projectRoot]        // новый параметр
 * @returns {Promise<string>}
 */
async function buildRelativePath(
    sourceFilePath,
    targetFilePath,
    addIndex,
    isImage,
    isDirectory,
    callbackForPromptAnchorSelection,
    useAbsolutePath = false,
    projectRoot
) {
    let documentRelativePath;
    if (useAbsolutePath && projectRoot) {
        documentRelativePath = buildAbsolutePath(projectRoot, targetFilePath, addIndex, true);
    } else {
        documentRelativePath = buildMdRelativePath(sourceFilePath, targetFilePath, addIndex);
    }
    if (isImage) return documentRelativePath;

    return await buildMdAnchorRelativePath(
        targetFilePath,
        isDirectory,
        documentRelativePath,
        callbackForPromptAnchorSelection
    );
}

module.exports = { buildMdAnchorRelativePath, buildRelativePath };
