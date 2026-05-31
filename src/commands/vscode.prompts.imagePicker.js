const path = require('node:path');
const vscode = require('vscode');

/** @import {ImageItem} from '../plugins/model/imageitem.model' */

/**
 * Показывает quick pick для выбора изображения из списка.
 * @param {ImageItem[]} images - Массив изображений для выбора
 * @param {string} workspaceRoot - Корневая папка рабочей области (для расчёта относительного пути)
 * @param {Object} [options] - Дополнительные опции
 * @param {string} [options.placeHolder='Выберите изображение...'] - Текст-заполнитель в поле поиска
 * @param {boolean} [options.matchOnDescription=true] - Учитывать описание при поиске
 * @param {boolean} [options.matchOnDetail=true] - Учитывать детали при поиске
 * @param {function(ImageItem): string} [options.formatDetail] - Функция форматирования строки деталей для каждого изображения
 * @returns {Promise<ImageItem | undefined>} Выбранное изображение или undefined, если выбор отменён
 */

async function showImagePicker(images, workspaceRoot, options = {}) {
    if (!images || images.length === 0) {
        return undefined;
    }

    const formatDetail = options.formatDetail ?? (() => '');

    const pickerItems = images.map(img => ({
        label: img.caption || 'Без названия',
        description: path.relative(workspaceRoot, img.filePath),
        detail: formatDetail(img),
        image: img,
    }));

    const selected = await vscode.window.showQuickPick(pickerItems, {
        placeHolder: options.placeHolder ?? 'Выберите изображение...',
        matchOnDescription: options.matchOnDescription ?? true,
        matchOnDetail: options.matchOnDetail ?? true,
    });

    return selected?.image;
}

module.exports = { showImagePicker };
