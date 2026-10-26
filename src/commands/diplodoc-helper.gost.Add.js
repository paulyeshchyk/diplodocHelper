const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { appendGostToDictionary } = require('../plugins/gosts/gosts.dictionary.writer.js');
const { inferLang } = require('../plugins/gosts/gosts.paths.js');

async function ux_gost_add() {
    const editor = vscode.window.activeTextEditor;
    const uri = editor ? editor.document.uri : vscode.workspace.workspaceFolders?.[0].uri;
    
    if (!uri) {
        vscode.window.showErrorMessage('Не удалось определить путь к проекту.');
        return;
    }

    const langDir = getLanguageRoot(uri.fsPath);
    if (!langDir) {
        vscode.window.showErrorMessage('Файл должен находиться внутри папки документации (docs/ru).');
        return;
    }

    // Получаем выделенный текст для подстановки в code
    let defaultCode = '';
    if (editor && !editor.selection.isEmpty) {
        defaultCode = editor.document.getText(editor.selection).trim();
    }

    const code = await vscode.window.showInputBox({ 
        prompt: 'Обозначение (напр. ГОСТ 11371-78)', 
        value: defaultCode, // <-- Подставляем выделенный текст
        ignoreFocusOut: true 
    });
    if (!code) return;

    const title = await vscode.window.showInputBox({ prompt: 'Название (напр. Шайба)', ignoreFocusOut: true });
    if (!title) return;

    const date = await vscode.window.showInputBox({ prompt: 'Дата введения', ignoreFocusOut: true });
    const status = await vscode.window.showInputBox({ prompt: 'Статус (Действующий, Заменён...)', ignoreFocusOut: true });
    const description = await vscode.window.showInputBox({ prompt: 'Дополнительная информация', ignoreFocusOut: true });

    const added = appendGostToDictionary(langDir, {
        code: code.trim(),
        title: title.trim(),
        date: date ? date.trim() : '',
        status: status ? status.trim() : '',
        description: description ? description.trim() : ''
    }, inferLang(langDir));

    if (added) {
        vscode.window.showInformationMessage(`✅ ГОСТ ${code} добавлен!`);
    } else {
        vscode.window.showWarningMessage(`⚠️ ГОСТ ${code} уже существует в справочнике.`);
    }
}

module.exports = { ux_gost_add };