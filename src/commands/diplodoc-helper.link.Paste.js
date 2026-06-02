//diplodoc-helper.link.Paste.js

const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const { buildImageLink } = require('../plugins/utils/md.links.figure.js');

const INDEX_MD = 'index.md';

// =============================================================================
// ГЛАВНАЯ ЭКСПОРТИРУЕМАЯ ФУНКЦИЯ
// =============================================================================
async function ux_link_paste() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const clipboardText = await vscode.env.clipboard.readText();
        const sourceFilePath = editor.document.uri.fsPath;

        const linkText = await ConvertDocumentPathToLink(clipboardText, sourceFilePath);

        await editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, linkText);
        });
    } catch (error) {
        let msg = error instanceof Error ? error.message : String(error);
        let template = `${translate(nls_ts.plugin.link.paste.error.critical)}: ${msg}`;
        vscode.window.showErrorMessage(template);
    }
}

// =============================================================================
// БЛОК ФУНКЦИЙ ДЛЯ РАБОТЫ С VSCode UI (все вызовы vscode.*)
// =============================================================================

/**
 * Показывает пользователю выбор якоря из списка + возможность ручного ввода
 * @param {Array<{label: string, anchor: string}>} anchors
 * @returns {Promise<string | undefined>} – выбранный anchor или undefined
 */
async function promptAnchorSelection(anchors) {
    const quickPickItems = anchors.map(item => ({
        label: item.label,
        description: `#${item.anchor}`,
        anchor: item.anchor,
    }));

    let item = {
        label: translate(nls_ts.plugin.link.paste.anchor.quickPick.label),
        description: translate(nls_ts.plugin.link.paste.anchor.quickPick.description),
        anchor: '__CUSTOM__',
    };
    quickPickItems.push(item);

    const selected = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: translate(nls_ts.plugin.link.paste.anchor.select),
        matchOnDescription: true,
    });

    if (!selected) return undefined;

    if (selected.anchor === '__CUSTOM__') {
        const customAnchor = await vscode.window.showInputBox({
            prompt: translate(nls_ts.plugin.link.paste.anchor.input.prompt),
            placeHolder: translate(nls_ts.plugin.link.paste.anchor.input.placeHolder),
            validateInput: value => {
                if (!value || value.trim() === '') {
                    return translate(nls_ts.plugin.link.paste.anchor.input.validate.error.emptyAnchor);
                }
                if (/\s/.test(value)) {
                    return translate(nls_ts.plugin.link.paste.anchor.input.validate.error.incorrectCharacters);
                }
                return null;
            },
        });
        return customAnchor?.trim();
    }

    return selected.anchor;
}

// =============================================================================
// БЛОК ФУНКЦИЙ ДЛЯ РАБОТЫ С MARKDOWN И ЯКОРЯМИ
// =============================================================================

/**
 * Преобразует заголовок в slug для якоря
 * @param {string} text
 * @returns {string}
 */
function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\u0400-\u04FF]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Извлекает якоря из Markdown-файла (заголовки, {#якоря}, HTML id)
 * @param {string} filePath – абсолютный путь к .md файлу
 * @returns {Promise<Array<{label: string, anchor: string}>>}
 */
async function extractAnchorsFromMdFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const anchors = [];
        const seenAnchors = new Set();

        // 1. Заголовки Markdown (с учётом возможных пробелов в начале)
        const headingRegex = /^\s*(#{1,6})\s+(.+?)(?:\s*\{#([^}]+)\})?\s*$/gm;
        let match;
        while ((match = headingRegex.exec(content)) !== null) {
            const level = match[1].length;
            let title = match[2].trim();
            let explicitAnchor = match[3]?.trim();

            let anchor;
            if (explicitAnchor) {
                anchor = explicitAnchor;
            } else {
                anchor = generateSlug(title);
            }

            if (!seenAnchors.has(anchor)) {
                seenAnchors.add(anchor);
                anchors.push({
                    label: `${'#'.repeat(level)} ${title}`,
                    anchor: anchor,
                });
            }
        }

        // 2. HTML-атрибуты id (регистронезависимо, с кавычками или без)
        const idRegex = /\bid\s*=\s*(["']?)([^"'\s>]+)\1/gi;
        let idMatch;
        while ((idMatch = idRegex.exec(content)) !== null) {
            const idValue = idMatch[2];
            if (!seenAnchors.has(idValue)) {
                seenAnchors.add(idValue);
                anchors.push({
                    label: `id: ${idValue}`,
                    anchor: idValue,
                });
            }
        }

        // 3. Дополнительно: якоря, определённые через <a name="value"> (legacy)
        const nameRegex = /<a\s+name\s*=\s*(["']?)([^"'\s>]+)\1/gi;
        let nameMatch;
        while ((nameMatch = nameRegex.exec(content)) !== null) {
            const nameValue = nameMatch[2];
            if (!seenAnchors.has(nameValue)) {
                seenAnchors.add(nameValue);
                anchors.push({
                    label: `name: ${nameValue}`,
                    anchor: nameValue,
                });
            }
        }

        return anchors;
    } catch {
        return [];
    }
}

/**
 * Возвращает путь к целевому MD-файлу для извлечения якорей (если применимо)
 * @param {string} targetFilePath – абсолютный путь к объекту (файл или папка)
 * @param {boolean} isDirectory – является ли объект папкой
 * @returns {string | null} – путь к .md файлу или null
 */
function getTargetMdFile(targetFilePath, isDirectory) {
    if (isDirectory) {
        return path.join(targetFilePath, INDEX_MD);
    }
    if (targetFilePath.endsWith('.md')) {
        return targetFilePath;
    }
    return null;
}

// =============================================================================
// БЛОК ФУНКЦИЙ ДЛЯ РАБОТЫ СО ССЫЛКАМИ
// =============================================================================

/**
 * Вычисляет относительный путь с кодированием
 * @param {string} fromPath – путь к исходному файлу (директория, относительно которой строим путь)
 * @param {string} toPath – целевой путь (файл или папка)
 * @param {boolean} addIndex – нужно ли добавить index.md (для ссылок на папки)
 * @returns {string}
 */
function calculateRelativeMdPath(fromPath, toPath, addIndex) {
    let targetFile = toPath;

    if (addIndex) {
        if (!targetFile.endsWith('.md')) {
            targetFile = path.join(targetFile, INDEX_MD);
        }
    }

    let relPath = path.relative(path.dirname(fromPath), targetFile);
    relPath = relPath.split(path.sep).join('/');

    const encodedPath = relPath
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');

    return encodedPath.startsWith('.') ? encodedPath : './' + encodedPath;
}

/**
 * Строит Markdown-ссылку на документ
 * @param {string} prefix – префикс (! для изображений, иначе пусто)
 * @param {string} sourceLinkName – текст ссылки
 * @param {string} mdPath – путь к целевому файлу (с возможным якорем)
 * @returns {string}
 */
function buildDocumentLink(prefix, sourceLinkName, mdPath) {
    return `${prefix}[${sourceLinkName}](${mdPath})`;
}

// =============================================================================
// БЛОК ФУНКЦИЙ ДЛЯ РАБОТЫ С ФАЙЛОВОЙ СИСТЕМОЙ
// =============================================================================

/**
 * Определяет тип целевого объекта (папка, изображение, обычный файл)
 * @param {string} targetFilePath – абсолютный путь
 * @returns {Promise<{isDirectory: boolean, isImage: boolean}>}
 */
async function getFileTypeInfo(targetFilePath) {
    let isDirectory = false;
    let isImage = false;

    const ext = path.extname(targetFilePath);

    try {
        const stat = await fs.stat(targetFilePath);
        isDirectory = stat.isDirectory();
        if (!isDirectory) {
            isImage = ext !== 'md';
        }
    } catch {
        if (!ext) {
            isDirectory = true; // нет расширения — считаем папкой
        }
    }
    return { isDirectory, isImage };
}

/**
 * Определяет, нужно ли добавлять index.md и какой префикс использовать
 * @param {string} targetFilePath
 * @param {boolean} isDirectory
 * @returns {{addIndex: boolean, prefix: string}}
 */
function getLinkOptions(targetFilePath, isDirectory) {
    if (isDirectory) {
        return { addIndex: true, prefix: '' };
    }
    if (targetFilePath.endsWith('.md')) {
        return { addIndex: false, prefix: '' };
    }
    return { addIndex: false, prefix: '!' };
}

// =============================================================================
// БЛОК ВСПОМОГАТЕЛЬНЫХ ФУНКЦИЙ (парсинг буфера, конвертация)
// =============================================================================

/**
 * @param {string} clipboardText
 * @returns {ClipboardLink | null}
 */
function parseClipboardLink(clipboardText) {
    try {
        return JSON.parse(clipboardText);
    } catch {
        return null;
    }
}

/**
 * Основная логика преобразования пути из буфера в Markdown-ссылку
 * @param {string} clipboardText
 * @param {string} sourceFilePath
 * @returns {Promise<string>}
 */
async function ConvertDocumentPathToLink(clipboardText, sourceFilePath) {
    const data = parseClipboardLink(clipboardText);
    if (data === null || !data.sourceLinkPath || !data.sourceLinkName) {
        throw new Error(translate('plugin.link.paste.error.emptybuffer'));
    }

    const targetFilePath = data.sourceLinkPath;
    const { isDirectory, isImage } = await getFileTypeInfo(targetFilePath);
    const { addIndex, prefix } = getLinkOptions(targetFilePath, isDirectory);

    let mdPath = calculateRelativeMdPath(sourceFilePath, targetFilePath, addIndex);

    // Предлагаем выбор якоря только для MD-документов или папок с index.md (не для изображений)
    if (!isImage) {
        const targetMdFile = getTargetMdFile(targetFilePath, isDirectory);
        if (targetMdFile) {
            const anchors = await extractAnchorsFromMdFile(targetMdFile);
            if (anchors.length > 0) {
                const selectedAnchor = await promptAnchorSelection(anchors);
                if (selectedAnchor) {
                    mdPath += `#${selectedAnchor}`;
                }
            }
        }
    }

    return isImage
        ? buildImageLink(data.sourceLinkName, mdPath)
        : buildDocumentLink(prefix, data.sourceLinkName, mdPath);
}

// =============================================================================
// ЭКСПОРТ
// =============================================================================
module.exports = { ux_link_paste };
