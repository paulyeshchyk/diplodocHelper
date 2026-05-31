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

/**
 * @param {string} filePath - Путь к .md файлу
 * @param {(key: string, image: ImageItem) => void} delegate
 */
async function ExtractMdLinks(filePath, delegate) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const mdDir = path.dirname(filePath);

    const markdownImageRegex = new RegExp(IMAGE_DETECTION_CONFIG.markdownImageRegex.source, 'gi');
    let match;
    while ((match = markdownImageRegex.exec(content)) !== null) {
        const rawPath = match[2]?.trim();
        if (!rawPath || rawPath.match(/^(https?:\/\/|#|mailto:|data:)/i)) continue;

        let decoded = decodeImagePath(rawPath);
        let absImagePath = path.resolve(mdDir, decoded);

        const normKey = normalizePathForKey(absImagePath);

        const basename = path.basename(absImagePath);
        const caption = path.parse(basename).name || basename;

        const entry = {
            id: basename,
            caption,
            filePath: filePath,
            targetPath: absImagePath,
            label: caption,
            type: 'markdown',
        };

        delegate(normKey, entry);
    }
}

/**
 * @param {string} filePath - Путь к .md файлу
 * @param {(key: string, image: ImageItem) => void} delegate
 */
async function ExtractFigures(filePath, delegate) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const mdFilePath = filePath;

    const figureRegex = new RegExp(IMAGE_DETECTION_CONFIG.figureRegex.source, 'gi');
    let match;
    while ((match = figureRegex.exec(content)) !== null) {
        const id = match[1].trim();
        const caption = match[2].trim();

        const imageAbsPath = findAssociatedImageAbsolutePath(content, mdFilePath);

        if (!imageAbsPath) continue;

        const normKey = normalizePathForKey(imageAbsPath);

        const entry = {
            id,
            caption: caption || 'Без описания',
            filePath: mdFilePath,
            targetPath: imageAbsPath,
            label: caption,
            type: 'figure',
        };

        delegate(normKey, entry);
    }
}

/**
 * Ищет связанное изображение для figure
 * @param {string} content
 * @param {string} mdFilePath
 */
function findAssociatedImageAbsolutePath(content, mdFilePath) {
    const mdDir = path.dirname(mdFilePath);
    const { marker, maxDistance } = IMAGE_DETECTION_CONFIG.figureAssociation;

    const imageRegex = new RegExp(IMAGE_DETECTION_CONFIG.markdownImageRegex.source, 'gi');
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
        const rawLink = match[2]?.trim();
        if (!rawLink) continue;

        if (rawLink.match(/^(https?:\/\/|#|mailto:|data:)/i)) continue;

        const afterImage = content.slice(match.index);
        if (afterImage.includes(marker) && afterImage.indexOf(marker) < maxDistance) {
            try {
                const decoded = decodeImagePath(rawLink);
                return path.resolve(mdDir, decoded);
            } catch (err) {
                let msg = err instanceof Error ? err.message : String(err);
                console.warn(`Не удалось разрешить путь изображения: ${rawLink}; err: ${msg}`);
            }
        }
    }

    return null;
}

module.exports = { ExtractFigures, ExtractMdLinks };
