// src/commands/diplodoc-helper.link.Paste.js

const { nls_ts, translate } = require('../nls_ts.js');
const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const { buildImageLink } = require('../plugins/utils/md.links.figure.js');
const { getCursorContext, indentMultilinedText } = require('./diplodoc-helper.cursor.Context.js');

const INDEX_MD = 'index.md';

// =============================================================================
// ГЛАВНАЯ ЭКСПОРТИРУЕМАЯ ФУНКЦИЯ
// =============================================================================
async function ux_link_paste() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        // --- 1. Фиксируем ВСЁ состояние редактора ДО любого await ---
        const doc = editor.document;
        const selection = editor.selection;
        const selectionRange = new vscode.Range(selection.start, selection.end);
        const selectedText = selection.isEmpty ? '' : doc.getText(selectionRange);
        const hasSelection = selectedText.length > 0;
        const insertPosition = selection.active;
        const sourceFilePath = doc.uri.fsPath;
        const cursorContext = getCursorContext(editor);

        // --- 2. Асинхронные операции ---
        const clipboardText = await vscode.env.clipboard.readText();

        // overrideLinkName влияет ТОЛЬКО на отображаемое имя ссылки.
        // Логика выбора якоря внутри отработает в обоих случаях.
        const linkText = await ConvertDocumentPathToLink(
            clipboardText,
            sourceFilePath,
            cursorContext.isHtml,
            hasSelection ? selectedText : null
        );
        if (linkText === null)
            return;

        // --- 3. Применяем правку и проверяем результат ---
        const applied = await editor.edit(editBuilder => {
            if (hasSelection) {
                editBuilder.replace(selectionRange, linkText);
            } else {
                const indentedText = indentMultilinedText(linkText, cursorContext.listIndent);
                editBuilder.insert(insertPosition, indentedText);
            }
        });

        if (!applied) {
            vscode.window.showWarningMessage(translate(nls_ts.plugin.link.paste.error.critical));
        }
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
        ignoreFocusOut: true,
    });

    if (!selected) return undefined;

    if (selected.anchor === '__CUSTOM__') {
        const customAnchor = await vscode.window.showInputBox({
            prompt: translate(nls_ts.plugin.link.paste.anchor.input.prompt),
            placeHolder: translate(nls_ts.plugin.link.paste.anchor.input.placeHolder),
            ignoreFocusOut: true, // <-- и здесь
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
 * @deprecated Импортируйте `Url_Transform_Reference.slugify` напрямую.
 *
 * Regression: 00.6.3#19.
 */

const { extractAnchorsFromMdFile } = require('../plugins/utils/link.utils.js');

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

const { Link_Build_Path } = require('../plugins/utils/link/Link_Build_Path.ts');
const { Link_Format_Markdown } = require('../plugins/utils/link/Link_Format_Markdown.ts');


/**
 * Основная логика преобразования пути из буфера в Markdown/HTML-ссылку
 * @param {string} clipboardText
 * @param {string} sourceFilePath
 * @param {boolean} shouldRenderAsHtml
 * @param {string?} overrideLinkName
 * @returns {Promise<string | null>}
 */
async function ConvertDocumentPathToLink(clipboardText, sourceFilePath, shouldRenderAsHtml, overrideLinkName = null) {
    const data = parseClipboardLink(clipboardText);
    if (data === null || !data.sourceLinkPath || !data.sourceLinkName) {
        throw new Error(translate('plugin.link.paste.error.emptybuffer'));
    }

    const linkName = overrideLinkName ?? data.sourceLinkName;
    const targetFilePath = data.sourceLinkPath;

    // ─── Рабочий корень обязателен ───
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showWarningMessage(
            translate('plugin.link.paste.error.outsideProject', targetFilePath),
        );
        return null;   // сигнал вызывающему: ничего не вставлять
    }

    const docsDirName = vscode.workspace.getConfiguration('diplodoc-helper').get('docsFolderName', 'docs');

    // ─── Контракт: только внутри docs/ ───
    try {
        Link_Build_Path.assertInsideDocs(workspaceRoot, targetFilePath, docsDirName);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[link.paste] ${msg}`);
        vscode.window.showWarningMessage(
            translate('plugin.link.paste.error.outsideProject', targetFilePath),
        );
        return null;
    }

    // ─── Определение типа цели ───
    const ext = path.extname(targetFilePath).toLowerCase();
    let isDirectory = false;
    let isImage = false;
    try {
        const stat = await fs.stat(targetFilePath);
        isDirectory = stat.isDirectory();
        if (!isDirectory) isImage = ext !== '.md';
    } catch {
        if (!ext) isDirectory = true;
    }

    // ─── Вычисление пути ───
    let mdPath;
    if (shouldRenderAsHtml) {
        mdPath = Link_Build_Path.buildAbsolute(workspaceRoot, targetFilePath, isDirectory, docsDirName);
    } else {
        mdPath = Link_Build_Path.buildRelative(sourceFilePath, targetFilePath, isDirectory);
    }

    // ─── Якорь (только для MD-документов) ───
    if (!isImage) {
        const targetMdFile = getTargetMdFile(targetFilePath, isDirectory);
        if (targetMdFile) {
            const anchors = await extractAnchorsFromMdFile(targetMdFile);
            if (anchors.length > 0) {
                const selectedAnchor = await promptAnchorSelection(anchors);
                if (selectedAnchor) mdPath += `#${selectedAnchor}`;
            }
        }
    }

    // ─── Финальная сборка ───
    if (isImage) {
        return shouldRenderAsHtml
            ? Link_Format_Markdown.format(linkName, mdPath, true, true)
            : buildImageLink(linkName, mdPath);
    }
    return Link_Format_Markdown.format(linkName, mdPath, false, shouldRenderAsHtml);
}

// =============================================================================
// ЭКСПОРТ
// =============================================================================
module.exports = { ux_link_paste, parseClipboardLink };
