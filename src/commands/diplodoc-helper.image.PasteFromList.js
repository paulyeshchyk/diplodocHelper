// diplodoc-helper.image.PasteFromList.js
const vscode = require('vscode');
const path = require('path');
const { readConfig } = require('./vscode.config.manager');
const { showImagePicker } = require('./vscode.prompts.imagePicker');
const { getRelativeLink } = require('../plugins/utils/path.extract');
const { ExtractMdLinks, ExtractFigures } = require('../plugins/utils/md.links.extract');
const { FindMdFiles } = require('./vscode.FindFiles');

/** @import {ImageItem} from '../plugins/model/imageitem.model' */

async function ux_image_paste_list() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('Команду можно использовать только в Markdown-файлах');
        return;
    }

    const currentFilePath = editor.document.uri.fsPath;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const rootDir = workspaceFolders[0].uri.fsPath;
    const images = await collectAllImages(rootDir);

    if (images.length === 0) {
        vscode.window.showInformationMessage('Изображения не найдены');
        return;
    }

    // Определяем собственную функцию форматирования деталей
    const formatDetail = (/** @type {ImageItem} */ img) => {
        return img.type === 'figure' ? `Figure • ${img.id}` : `Изображение • ${path.basename(img.targetPath)}`;
    };

    const selectedImage = await showImagePicker(images, rootDir, {
        placeHolder: 'Выберите изображение для ссылки...',
        formatDetail: formatDetail,
    });

    if (!selectedImage) return;

    const relativeLink = getRelativeLink(currentFilePath, selectedImage);
    const figureReferencePrefix = readConfig().figureReferencePrefix;
    const markdownLink = `${figureReferencePrefix}[*${selectedImage.caption}*](${relativeLink})`;

    await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, markdownLink);
    });

    vscode.window.showInformationMessage(`Вставлена ссылка: ${selectedImage.caption}`);
}

/**
 * @param {string | vscode.Uri | vscode.WorkspaceFolder} rootDir
 */
async function collectAllImages(rootDir) {
    const imageByNormalizedPath = new Map();

    const mdFiles = await FindMdFiles(rootDir);

    /** @type ImageItem[] */
    const images = [];

    for (const fileUri of mdFiles) {
        await ExtractFigures(fileUri.fsPath, (key, image) => {
            if (!imageByNormalizedPath.has(key)) {
                images.push(image);
                imageByNormalizedPath.set(key, image);
            }
        });
        await ExtractMdLinks(fileUri.fsPath, (key, image) => {
            if (!imageByNormalizedPath.has(key)) {
                images.push(image);
                imageByNormalizedPath.set(key, image);
            }
        });
    }

    // Сортировка
    images.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'figure' ? -1 : 1;
        const captionA = a.caption ?? '';
        const captionB = b.caption ?? '';
        return captionA.localeCompare(captionB);
    });

    return images;
}

module.exports = { ux_image_paste_list };
