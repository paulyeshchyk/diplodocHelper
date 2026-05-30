const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * Нормализует путь для использования в качестве ключа (решает проблему с регистром)
 * @typedef {Object} ImageInfo
 * @property {string} id
 * @property {string} caption
 * @property {string} filePath // .md файл, где найдено
 // .md файл, где найдено
 * @property {string} targetPath // абсолютный путь к КАРТИНКЕ
 // абсолютный путь к КАРТИНКЕ
 * @property {string} label
 * @property {'figure' | 'markdown'} type
 * @param {string} filePath
 */
function normalizePathForKey(filePath) {
    return filePath.toLowerCase().replace(/\\/g, '/').replace(/\/+/g, '/');
}

/**
 * Главная функция
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

/**
 * Улучшенный сборщик с правильной дедупликацией
 * @param {string | vscode.Uri | vscode.WorkspaceFolder} rootDir
 */
async function collectAllImages(rootDir) {
    const images = [];
    const imageByNormalizedPath = new Map();

    const mdFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(rootDir, '**/*.md'),
        '**/node_modules/**'
    );

    // 1. Figures — высший приоритет
    const figRegex = /<figcaption\s+class="imageDescription"[^>]*?\bid="([^"]+)"[^>]*?>([\s\S]*?)<\/figcaption>/gi;

    for (const fileUri of mdFiles) {
        const content = await fs.promises.readFile(fileUri.fsPath, 'utf8');
        const mdFilePath = fileUri.fsPath;

        let match;
        while ((match = figRegex.exec(content)) !== null) {
            const id = match[1].trim();
            let caption = match[2].trim();

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
    const mdImageRegex = /!\[(.*?)\]\(([^)]+)\)/g;

    for (const fileUri of mdFiles) {
        const content = await fs.promises.readFile(fileUri.fsPath, 'utf8');
        const mdDir = path.dirname(fileUri.fsPath);

        let match;
        while ((match = mdImageRegex.exec(content)) !== null) {
            const rawPath = match[2]?.trim();
            if (!rawPath || rawPath.match(/^(https?:\/\/|#|mailto:|data:)/i)) continue;

            let decoded = decodeImagePath(rawPath);
            let absImagePath;

            try {
                absImagePath = path.resolve(mdDir, decoded);
            } catch {
                absImagePath = decoded;
            }

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

    images.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'figure' ? -1 : 1;
        return a.caption.localeCompare(b.caption);
    });

    return images;
}

/**
 * Ищет путь к изображению, связанному с figure (улучшенная эвристика)
 * @param {string} content
 * @param {string} mdFilePath
 */
function findAssociatedImageAbsolutePath(content, mdFilePath) {
    const mdDir = path.dirname(mdFilePath);

    // Regex для markdown-изображений: ![alt](path)
    const imageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
        const rawLink = match[1]?.trim();
        if (!rawLink) continue;

        if (rawLink.match(/^(https?:\/\/|#|mailto:|data:)/i)) continue;

        // Проверяем, есть ли figure в пределах ~400 символов после этой картинки
        const afterImage = content.slice(match.index);
        if (afterImage.includes('<figcaption') && afterImage.indexOf('<figcaption') < 400) {
            try {
                const decoded = decodeImagePath(rawLink);
                return path.resolve(mdDir, decoded);
            } catch (err) {
                console.warn(`Не удалось разрешить путь: ${rawLink}`);
            }
        }
    }

    return null;
}

/**
 * Декодирует путь
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
 * Корректный относительный путь
 * @param {string} currentFilePath
 * @param {{ id: any; caption?: string; filePath: any; targetPath: any; label?: string; type: any; }} image
 */
function getRelativeLink(currentFilePath, image) {
    let target = image.targetPath; // теперь всегда путь к картинке

    if (image.type === 'figure') {
        target = `${image.filePath}#${image.id}`;
    }

    let relative = path.relative(path.dirname(currentFilePath), target).replace(/\\/g, '/');

    if (!relative.startsWith('.')) {
        relative = './' + relative;
    }

    return relative;
}

module.exports = { pasteImageFromListAsync };
