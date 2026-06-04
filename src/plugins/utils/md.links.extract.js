const fs = require('fs');
const path = require('path');
const { decodeImagePath, normalizePathForKey } = require('./path.extract');

/** @import {ImageItem} from '../model/imageitem.model' */

const IMAGE_DETECTION_CONFIG = {
    figureRegex: /<figcaption\s+class="imageDescription"[^>]*?\bid="([^"]+)"[^>]*?>([\s\S]*?)<\/figcaption>/gi,
    figureAssociation: {
        maxDistance: 400,
        marker: '<figcaption',
    },
    markdownImageRegex: /!\[(.*?)\]\(([^)]+)\)/g,
};

// ----- Вспомогательные функции -----

/**
 * Проверяет, является ли ссылка внешним ресурсом или data URL.
 * @param {string} rawLink
 * @returns {boolean}
 */
function isRemoteOrDataUrl(rawLink) {
    return /^(https?:\/\/|#|mailto:|data:)/i.test(rawLink);
}

/**
 * Преобразует относительный путь из markdown в абсолютный.
 * @param {string} rawLink - Путь из markdown (например, ./images/foo.png)
 * @param {string} mdFilePath - Путь к .md файлу
 * @returns {string} Абсолютный путь
 */
function resolveImagePath(rawLink, mdFilePath) {
    const mdDir = path.dirname(mdFilePath);
    const decoded = decodeImagePath(rawLink);
    return path.resolve(mdDir, decoded);
}

// ----- Извлечение данных из контента -----

/**
 * @typedef {Object} MarkdownImageInfo
 * @property {number} pos - Индекс начала изображения в тексте
 * @property {string} path - Абсолютный путь к файлу изображения
 */

/**
 * Извлекает все markdown-изображения из контента.
 * @param {string} content - Содержимое .md файла
 * @param {string} mdFilePath - Путь к .md файлу (для резолвинга путей)
 * @returns {MarkdownImageInfo[]}
 */
function extractMarkdownImages(content, mdFilePath) {
    const images = [];
    const regex = new RegExp(IMAGE_DETECTION_CONFIG.markdownImageRegex.source, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
        const rawLink = match[2]?.trim();
        if (!rawLink || isRemoteOrDataUrl(rawLink)) continue;
        const absPath = resolveImagePath(rawLink, mdFilePath);
        images.push({ pos: match.index, path: absPath });
    }
    return images;
}

/**
 * @typedef {Object} FigcaptionInfo
 * @property {number} pos - Индекс начала <figcaption> в тексте
 * @property {string} id - Значение атрибута id
 * @property {string} caption - Текст внутри <figcaption>
 */

/**
 * Извлекает все <figcaption> с классом imageDescription.
 * @param {string} content
 * @returns {FigcaptionInfo[]}
 */
function extractFigcaptions(content) {
    const figcaptions = [];
    const regex = new RegExp(IMAGE_DETECTION_CONFIG.figureRegex.source, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
        figcaptions.push({
            pos: match.index,
            id: match[1].trim(),
            caption: match[2].trim(),
        });
    }
    return figcaptions;
}

// ----- Сопоставление подписей и изображений -----

/**
 * Сопоставляет каждую подпись с ближайшим изображением слева.
 * @param {MarkdownImageInfo[]} images
 * @param {FigcaptionInfo[]} figcaptions
 * @param {number|null} maxDistance - Максимальное допустимое расстояние (по умолчанию null – без ограничения)
 * @returns {Map<FigcaptionInfo, MarkdownImageInfo>} Карта «подпись -> изображение»
 */
function matchCaptionsToImages(images, figcaptions, maxDistance = null) {
    const used = new Set();
    const matches = new Map();

    for (const fig of figcaptions) {
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let i = 0; i < images.length; i++) {
            if (used.has(i)) continue;
            if (images[i].pos < fig.pos) {
                const dist = fig.pos - images[i].pos;
                if (dist < bestDist) {
                    bestDist = dist;
                    bestIdx = i;
                }
            }
        }
        if (bestIdx !== -1 && (maxDistance === null || bestDist <= maxDistance)) {
            used.add(bestIdx);
            matches.set(fig, images[bestIdx]);
        } else {
            console.warn(`Нет подходящего изображения для подписи id="${fig.id}"`);
        }
    }
    return matches;
}

// ----- Создание entry для делегата -----

/**
 * Создаёт объект ImageItem для figure.
 * @param {FigcaptionInfo} fig
 * @param {MarkdownImageInfo} image
 * @param {string} filePath
 * @returns {ImageItem}
 */
function createFigureEntry(fig, image, filePath) {
    return {
        id: fig.id,
        caption: fig.caption || 'Без описания',
        filePath: filePath,
        targetPath: image.path,
        label: fig.caption,
        type: 'figure',
    };
}

// ----- Основные экспортируемые функции -----

/**
 * Извлекает обычные markdown-изображения (без figure/figcaption).
 * @param {string} filePath - Путь к .md файлу
 * @param {(key: string, image: ImageItem) => void} delegate
 */
async function ExtractMdLinks(filePath, delegate) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const images = extractMarkdownImages(content, filePath);
    for (const img of images) {
        const normKey = normalizePathForKey(img.path);
        const basename = path.basename(img.path);
        const caption = path.parse(basename).name || basename;
        const entry = {
            id: basename,
            caption,
            filePath: filePath,
            targetPath: img.path,
            label: caption,
            type: 'markdown',
        };
        delegate(normKey, entry);
    }
}

/**
 * Извлекает изображения, связанные с <figure><figcaption>...</figcaption></figure>.
 * @param {string} filePath - Путь к .md файлу
 * @param {(key: string, image: ImageItem) => void} delegate
 */
async function ExtractFigures(filePath, delegate) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const images = extractMarkdownImages(content, filePath);
    const figcaptions = extractFigcaptions(content);
    const matches = matchCaptionsToImages(images, figcaptions, IMAGE_DETECTION_CONFIG.figureAssociation.maxDistance);

    for (const [fig, image] of matches.entries()) {
        const entry = createFigureEntry(fig, image, filePath);
        const normKey = normalizePathForKey(image.path);
        delegate(normKey, entry);
    }
}

module.exports = { ExtractFigures, ExtractMdLinks };
