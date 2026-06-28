const path = require('path');
const fs = require('fs');
const { IndexMdFileRead } = require('../../../utils/md.index.file');

/**
 * @param {string} fsPath
 * @returns {{cl: ClipboardLink; title: string}}
 */
function buildClipboardLink(fsPath) {
    const stats = fs.statSync(fsPath);

    let targetPath = fsPath;

    let title = buildTitle(stats, fsPath);

    /** @type {ClipboardLink}*/
    const cl = {
        sourceLinkName: title,
        sourceLinkPath: targetPath,
        isImage: /\.(png|jpe?g|gif|svg|webp)$/i.test(fsPath), // Пометка, если это картинка
    };
    return { cl, title };
}

/**
 * @param {fs.Stats} stats
 * @param {string} fsPath
 */
function buildTitle(stats, fsPath) {
    if (stats.isDirectory()) {
        // Логика для раздела (папки)
        const section = IndexMdFileRead(fsPath);
        return section?.pureTitle || path.basename(fsPath);
    } else {
        // Логика для файла (картинки, документы)
        return path.basename(fsPath);
    }
}
module.exports = { buildClipboardLink };
