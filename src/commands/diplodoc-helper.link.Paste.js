// src/commands/diplodoc-helper.link.Paste.js
const { nls_ts, translate } = require('../nls_ts.js');
const vscode = require('vscode');
const { ConvertDocumentPathToLink } = require('../plugins/shared/converters/documentLinkConverter.js');
const { getDocsRoot } = require('../plugins/utils/index.js');
const { getProjectRoot } = require('./vscode.FindFiles.js');

// =============================================================================
// ГЛАВНАЯ ЭКСПОРТИРУЕМАЯ ФУНКЦИЯ
// =============================================================================
async function ux_link_paste() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const clipboardText = await vscode.env.clipboard.readText();
        const sourceFilePath = editor.document.uri.fsPath;
        const position = editor.selection.active;
        const lineText = editor.document.lineAt(position.line).text;
        const documentTextBefore = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), position));

        const workspacePath = getProjectRoot();
        const docsRoot = getDocsRoot(workspacePath);

        const linkText = await ConvertDocumentPathToLink(
            clipboardText,
            sourceFilePath,
            position,
            lineText,
            promptAnchorSelection,
            docsRoot,
            documentTextBefore
        );

        await editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, linkText);
        });
    } catch (error) {
        console.error(`ux_link_paste error: ${error}`);
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

module.exports = { ux_link_paste };
