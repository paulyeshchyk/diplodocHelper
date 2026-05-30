const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * ==================== МОДЕЛЬ / КОНФИГУРАЦИЯ ====================
 */
const IMAGE_DETECTION_CONFIG = {
    // Regex для поиска figure
    figureRegex: /<figcaption\s+class="imageDescription"[^>]*?\bid="([^"]+)"[^>]*?>([\s\S]*?)<\/figcaption>/gi,

    // Параметры поиска связанного изображения для figure
    figureAssociation: {
        maxDistance: 400, // символов после картинки
        marker: '<figcaption',
        // Можно расширить позже: например, добавить несколько маркеров
    },

    // Regex для markdown-изображений
    markdownImageRegex: /!\[(.*?)\]\(([^)]+)\)/g,
};

/**
 * Нормализация пути для дедупликации (регистронезависимо)
 * @param {string} filePath
 */
function normalizePathForKey(filePath) {
    return filePath.toLowerCase().replace(/\\/g, '/').replace(/\/+/g, '/');
}

/**
 * Главная команда
 */
async function pasteImageFromListAsync() {
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

    const selected = await vscode.window.showQuickPick(
        images.map(img => ({
            label: img.caption,
            description: path.relative(rootDir, img.filePath),
            detail: img.type === 'figure' ? `Figure • ${img.id}` : `Изображение • ${path.basename(img.targetPath)}`,
            image: img,
        })),
        {
            placeHolder: 'Выберите изображение для ссылки...',
            matchOnDescription: true,
            matchOnDetail: true,
        }
    );

    if (!selected) return;

    const { image } = selected;
    const relativeLink = getRelativeLink(currentFilePath, image);

    const markdownLink = `см. [*${image.caption}*](${relativeLink})`;

    await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, markdownLink);
    });

    vscode.window.showInformationMessage(`Вставлена ссылка: ${image.caption}`);
}

/* ====================== СБОР ИЗОБРАЖЕНИЙ ====================== */

/**
 * @param {string | vscode.Uri | vscode.WorkspaceFolder} rootDir
 */
async function collectAllImages(rootDir) {
    const images = [];
    const imageByNormalizedPath = new Map();

    const mdFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(rootDir, '**/*.md'),
        '**/node_modules/**'
    );

    // 1. Figures — приоритет
    for (const fileUri of mdFiles) {
        const content = await fs.promises.readFile(fileUri.fsPath, 'utf8');
        const mdFilePath = fileUri.fsPath;

        let match;
        while ((match = IMAGE_DETECTION_CONFIG.figureRegex.exec(content)) !== null) {
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

            images.push(entry);
            imageByNormalizedPath.set(normKey, entry);
        }
    }

    // 2. Markdown изображения (только без figure)
    for (const fileUri of mdFiles) {
        const content = await fs.promises.readFile(fileUri.fsPath, 'utf8');
        const mdDir = path.dirname(fileUri.fsPath);

        let match;
        while ((match = IMAGE_DETECTION_CONFIG.markdownImageRegex.exec(content)) !== null) {
            const rawPath = match[2]?.trim();
            if (!rawPath || rawPath.match(/^(https?:\/\/|#|mailto:|data:)/i)) continue;

            let decoded = decodeImagePath(rawPath);
            let absImagePath = path.resolve(mdDir, decoded);

            const normKey = normalizePathForKey(absImagePath);

            if (imageByNormalizedPath.has(normKey)) continue;

            const basename = path.basename(absImagePath);
            const caption = path.parse(basename).name || basename;

            const entry = {
                id: basename,
                caption,
                filePath: fileUri.fsPath,
                targetPath: absImagePath,
                label: caption,
                type: 'markdown',
            };

            images.push(entry);
            imageByNormalizedPath.set(normKey, entry);
        }
    }

    // Сортировка
    images.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'figure' ? -1 : 1;
        return a.caption.localeCompare(b.caption);
    });

    return images;
}

/**
 * Ищет связанное изображение для figure
 * @param {string} content
 * @param {string} mdFilePath
 */
function findAssociatedImageAbsolutePath(content, mdFilePath) {
    const mdDir = path.dirname(mdFilePath);
    const { marker, maxDistance } = IMAGE_DETECTION_CONFIG.figureAssociation;

    const imageRegex = IMAGE_DETECTION_CONFIG.markdownImageRegex;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
        const rawLink = match[2]?.trim(); // исправлено: match[2]
        if (!rawLink) continue;

        if (rawLink.match(/^(https?:\/\/|#|mailto:|data:)/i)) continue;

        const afterImage = content.slice(match.index);
        if (afterImage.includes(marker) && afterImage.indexOf(marker) < maxDistance) {
            try {
                const decoded = decodeImagePath(rawLink);
                return path.resolve(mdDir, decoded);
            } catch (err) {
                console.warn(`Не удалось разрешить путь изображения: ${rawLink}`);
            }
        }
    }

    return null;
}

/**
 * Декодирует URL-encoded путь
 * @param {string} rawPath
 */
function decodeImagePath(rawPath) {
    try {
        return decodeURIComponent(rawPath.split('#')[0]);
    } catch {
        return rawPath;
    }
}

/**
 * Вычисляет относительный путь
 * @param {string} currentFilePath
 * @param {{ id: any; caption?: string; filePath: any; targetPath: any; label?: string; type: any; }} image
 */
function getRelativeLink(currentFilePath, image) {
    const target = image.type === 'figure' ? `${image.filePath}#${image.id}` : image.targetPath;

    let relative = path.relative(path.dirname(currentFilePath), target).replace(/\\/g, '/');

    if (!relative.startsWith('.')) {
        relative = './' + relative;
    }

    return relative;
}

module.exports = { pasteImageFromListAsync };
