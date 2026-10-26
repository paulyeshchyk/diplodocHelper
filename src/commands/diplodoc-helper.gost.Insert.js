const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { loadGostDictionary } = require('../plugins/gosts/gosts.dictionary.js');
const { getGostOutputDir } = require('../plugins/gosts/gosts.paths.js');
const { slugify_latin_alphanumeric } = require('../plugins/utils/encoding.slugify.js');
const { inferLang } = require('../plugins/gosts/gosts.paths.js');

async function ux_gost_insert() {
    const editor = vscode.window.activeTextEditor;
    // if (!editor || editor.document.languageId !== 'markdown') {
    //     vscode.window.showWarningMessage('Команда доступна только в Markdown-файлах.');
    //     return;
    // }
    if (!editor ) {
        vscode.window.showWarningMessage('Команда доступна только в редакторе.');
        return;
    }

    const docPath = editor.document.uri.fsPath;
    const langDir = getLanguageRoot(docPath);
    if (!langDir) return;

    // TODO: Решить проблему в yaml при вставке ссылки. 
    // Если техпис вручную вставляет ссылку в .yaml, он должен оборачивать её в кавычки 
    // или использовать блочный текст (>-), иначе YAML ломается из-за символа '[' или ':'.
    // Наш writer (gosts.dictionary.writer.js) делает это автоматически через >-.

    const entries = loadGostDictionary(langDir, inferLang(langDir));
    if (entries.length === 0) {
        vscode.window.showWarningMessage('Справочник ГОСТов пуст.');
        return;
    }

    const items = entries.map(item => ({
        label: item.code,
        description: item.title,
        detail: item.status,
        gost: item
    }));

    const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Выберите ГОСТ для вставки ссылки',
        matchOnDescription: true,
        matchOnDetail: true
    });

    if (!picked) return;

    // Определяем текст ссылки: если есть выделение — берем его, иначе — код ГОСТа
    const selectedText = editor.document.getText(editor.selection).trim();
    const linkText = selectedText ? selectedText : picked.gost.code;

    // Формируем путь
    const anchor = `gost-${slugify_latin_alphanumeric(picked.gost.code)}`;
    const gostDir = getGostOutputDir(langDir, inferLang(langDir));
    const gostIndexPath = path.join(gostDir, 'index.md');
    
    let relPath = path.relative(path.dirname(docPath), gostIndexPath).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) relPath = './' + relPath;

    // Правильное кодирование: encodeURI оставляет нетронутыми /, #, .., 
    // но переводит кириллицу в безопасный формат %D0...
    const encodedUrl = encodeURI(`${relPath}#${anchor}`);
    const link = `[${linkText}](${encodedUrl})`;

    // Вставляем с заменой выделения или просто в позицию курсора
    if (!editor.selection.isEmpty) {
        await editor.edit(eb => eb.replace(editor.selection, link));
    } else {
        await editor.edit(eb => eb.insert(editor.selection.active, link));
    }
}

module.exports = { ux_gost_insert };