//diplodoc-helper.link.AddAnchor.js

const { nls_ts, translate } = require('../nls_ts.js');

const vscode = require('vscode');
const { slugify_latin_alphanumeric } = require('../plugins/utils/encoding.slugify.js');

// =============================================================================
// ГЛАВНАЯ ЭКСПОРТИРУЕМАЯ ФУНКЦИЯ
// =============================================================================
async function ux_add_anchor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.link.addAnchor.error.noEditor));
        return;
    }

    // Проверяем, что документ - Markdown
    if (editor.document.languageId !== 'markdown') {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.link.addAnchor.error.notMarkdown));
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.link.addAnchor.error.noSelection));
        return;
    }

    const selectedText = editor.document.getText(selection);
    if (!selectedText || selectedText.trim().length === 0) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.link.addAnchor.error.emptySelection));
        return;
    }

    // Проверяем, что выделение не внутри HTML-тега или Markdown-ссылки
    if (isInsideHtmlTag(editor.document, selection) || isInsideMarkdownLink(editor.document, selection)) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.link.addAnchor.error.invalidContext));
        return;
    }

    // Запрашиваем ID якоря
    const rawId = await promptForAnchorId();
    if (!rawId) {
        return; // пользователь отменил ввод
    }

    const sanitizedId = slugify_latin_alphanumeric(rawId);
    if (!sanitizedId) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.link.addAnchor.error.invalidId));
        return;
    }

    const wrappedText = `<div id='${sanitizedId}' class='diplodocanchor'>${selectedText}</div>`;

    await editor.edit(editBuilder => {
        editBuilder.replace(selection, wrappedText);
    });
}

// =============================================================================
// БЛОК ФУНКЦИЙ ДЛЯ РАБОТЫ С VSCode UI
// =============================================================================

/**
 * Показывает диалог ввода ID якоря
 * @returns {Promise<string | undefined>}
 */
async function promptForAnchorId() {
    const id = await vscode.window.showInputBox({
        prompt: translate(nls_ts.plugin.link.addAnchor.input.prompt),
        placeHolder: translate(nls_ts.plugin.link.addAnchor.input.placeHolder),
        validateInput: value => {
            if (!value || value.trim().length === 0) {
                return translate(nls_ts.plugin.link.addAnchor.input.error.empty);
            }
            // Дополнительная проверка: не должен содержать пробелы и спецсимволы (кроме дефиса)
            if (/[^a-zA-Z0-9\u0400-\u04FF\-_]/.test(value)) {
                return translate(nls_ts.plugin.link.addAnchor.input.error.invalidChars);
            }
            return null;
        },
    });
    return id;
}

// =============================================================================
// БЛОК ФУНКЦИЙ ДЛЯ ПРОВЕРКИ КОНТЕКСТА (HTML, Markdown ссылки)
// =============================================================================

/**
 * Проверяет, находится ли выделение внутри HTML-тега (внутри < >)
 * @param {vscode.TextDocument} document
 * @param {vscode.Selection} selection
 * @returns {boolean}
 */
function isInsideHtmlTag(document, selection) {
    const startPos = selection.start;
    const line = document.lineAt(startPos.line).text;
    const charIndex = startPos.character;

    // Ищем открывающий '<' до позиции курсора
    let lastLt = -1;
    for (let i = charIndex - 1; i >= 0; i--) {
        if (line[i] === '<') {
            lastLt = i;
            break;
        }
    }
    if (lastLt === -1) return false;

    // Ищем закрывающий '>' после позиции курсора
    let nextGt = -1;
    for (let i = charIndex; i < line.length; i++) {
        if (line[i] === '>') {
            nextGt = i;
            break;
        }
    }
    if (nextGt === -1) return false;

    // Если между последним '<' и следующим '>' есть выделение — значит внутри тега
    return lastLt < charIndex && charIndex < nextGt;
}

/**
 * Проверяет, находится ли выделение внутри Markdown-ссылки [text](url) или ![alt](url)
 * @param {vscode.TextDocument} document
 * @param {vscode.Selection} selection
 * @returns {boolean}
 */
function isInsideMarkdownLink(document, selection) {
    const startPos = selection.start;
    const line = document.lineAt(startPos.line).text;
    const charIndex = startPos.character;

    // Проверяем, не находится ли выделение внутри конструкции [...]
    // Ищем '[' перед позицией
    let lastBracket = -1;
    for (let i = charIndex - 1; i >= 0; i--) {
        if (line[i] === '[') {
            lastBracket = i;
            break;
        }
    }
    if (lastBracket === -1) return false;

    // Ищем закрывающую ']' после позиции
    let nextClosingBracket = -1;
    for (let i = charIndex; i < line.length; i++) {
        if (line[i] === ']') {
            nextClosingBracket = i;
            break;
        }
    }
    if (nextClosingBracket === -1) return false;

    // После ']' должна идти '(' для ссылки
    if (nextClosingBracket + 1 < line.length && line[nextClosingBracket + 1] === '(') {
        return true;
    }

    // Также проверяем, что выделение не внутри уже существующего HTML-тега (но это уже покрыто isInsideHtmlTag)
    return false;
}

// =============================================================================
// ЭКСПОРТ
// =============================================================================
module.exports = { ux_add_anchor };
