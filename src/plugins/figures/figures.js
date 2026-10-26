// @ts-nocheck
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const { walkMdFilesGetFigures } = require('./figures.collector');
const { writeFigureList } = require('./figures.writer');

const LANGUAGES = ['ru', 'en'];

/**
 * Генерирует MD5-хеш от строки пути, чтобы имя файла превью гарантированно
 * вписывалось в ограничения Windows по длине пути.
 */
function getPathHash(relPath) {
    return crypto.createHash('md5').update(relPath).digest('hex').slice(0, 12);
}

async function createThumbnail(absImgPath, absThumbPath) {
    // Преобразуем пути в длинный формат для Windows
    const extImgPath = toExtendedPath(absImgPath);
    const extThumbPath = toExtendedPath(absThumbPath);

    if (fs.existsSync(extThumbPath)) return;

    try {
        const thumbDir = path.dirname(extThumbPath);
        if (!fs.existsSync(thumbDir)) {
            fs.mkdirSync(thumbDir, { recursive: true });
        }

        // Передаем sharp длинный путь
        await sharp(extImgPath)
            .resize({ width: 360, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(extThumbPath);
    } catch (err) {
        console.warn(`[Figures] Не удалось создать превью для ${absImgPath}:`, err.message);
    }
}

async function processThumbnails(lang, langDir, figures) {
    const thumbsDir = path.join(langDir, 'figures', 'thumbs');

    for (const fig of figures) {
        if (!fig.imagePath || /^(https?:|data:|\/\/)/i.test(fig.imagePath)) continue;

        const rawPath = String(fig.imagePath).trim().replace(/^<|>$/g, '');
        const sourceDir = path.dirname(fig.sourcePath);
        const absImgPath = path.resolve(langDir, sourceDir, rawPath);

        // Проверяем существование файла с длинным путем
        if (!fs.existsSync(toExtendedPath(absImgPath))) {
            console.warn(`[Figures] Файл изображения не найден: ${absImgPath}`);
            continue;
        }

        const parsed = path.parse(rawPath);
        const relPathForHash = path.join(sourceDir, rawPath).replace(/\\/g, '/');
        const hash = getPathHash(relPathForHash);

        const thumbFileName = `${parsed.name}_${hash}.webp`;
        const absThumbPath = path.join(thumbsDir, thumbFileName);

        await createThumbnail(absImgPath, absThumbPath);

        fig.thumbPath = `/${lang}/figures/thumbs/${thumbFileName}`;
    }
}

/**
 * Преобразует абсолютный путь Windows в путь с префиксом Extended-Length (\\?\),
 * чтобы обойти лимит в 260 символов (MAX_PATH).
 */
function toExtendedPath(absPath) {
    const normalized = path.resolve(absPath);
    if (process.platform === 'win32' && !normalized.startsWith('\\\\?\\')) {
        return `\\\\?\\${normalized}`;
    }
    return normalized;
}

async function generateFilesForLang(lang, langDir, figures) {
    try {
        if (figures.length === 0) {
            console.warn(`[Figures] В "${lang}" не найдено ни одного рисунка.`);
            return false;
        }

        await processThumbnails(lang, langDir, figures);

        const outputDir = path.join(langDir, 'figures');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        writeFigureList(outputDir, figures, lang);
        console.log(`[Figures] ${lang}: собрано ${figures.length} → ${outputDir}`);
        return true;
    } catch (err) {
        console.error(`❌ [Figures] Ошибка для ${lang}:`, err);
        return false;
    }
}

async function runGeneration(docsRoot) {
    const results = { success: [], failed: [] };
    for (const lang of LANGUAGES) {
        const langDir = path.join(docsRoot, lang);
        if (fs.existsSync(langDir)) {
            if (await generateFilesForLang(lang, langDir, walkMdFilesGetFigures(langDir))) {
                results.success.push(lang);
            } else {
                results.failed.push(lang);
            }
        }
    }
    return results;
}

module.exports = { runGeneration };
