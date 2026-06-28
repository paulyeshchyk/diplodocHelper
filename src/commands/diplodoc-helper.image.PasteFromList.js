// diplodoc-helper.image.PasteFromList.js
const vscode = require('vscode');
const path = require('path');
const { showImagePicker } = require('./vscode.prompts.imagePicker');
const { getRelativeLink } = require('../plugins/utils/path.extract');
const { ExtractMdLinks, ExtractFigures } = require('../plugins/shared/extractors/figuresExtractor');
const { FindMdFiles, getProjectRoot } = require('./vscode.FindFiles');

/** @import {ImageItem} from '../plugins/model/imageitem.model' */

async function ux_image_paste_list() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('Команду можно использовать только в Markdown-файлах');
        return;
    }

    const rootDir = getProjectRoot();
    if (!rootDir) return;

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

    const currentFilePath = editor.document.uri.fsPath;
    const relativeLink = getRelativeLink(currentFilePath, selectedImage);
    const markdownLink = `![*${selectedImage.caption}*](${relativeLink})`;

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
        // 1. Сначала по типу (figure раньше остальных)
        if (a.type !== b.type) {
            return a.type === 'figure' ? -1 : 1;
        }

        // 2. Извлекаем номер рисунка
        const numA = extractFigureNumber(a.caption);
        const numB = extractFigureNumber(b.caption);

        // 3. Если номера отличаются — сортируем по ним численно
        if (numA !== numB) {
            return numA - numB;
        }

        // 4. Если номера одинаковые или не найдены — сортируем по тексту подписи
        const captionA = a.caption ?? '';
        const captionB = b.caption ?? '';
        return captionA.localeCompare(captionB);
    });

    return images;
}

/**
 * @param {string | undefined} caption
 */
function extractFigureNumber(caption) {
    if (!caption) return 0;

    const match = caption.match(/(?:Рисунок|Figure)\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
}
module.exports = { ux_image_paste_list };
