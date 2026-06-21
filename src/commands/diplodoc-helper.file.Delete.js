// src/commands/diplodoc-helper.file.Delete.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { updateLinksAfterDelete } = require('./diplodoc-helper.links.md.js');
const { buildMdFileReferences } = require('./diplodoc-helper.file.md.js');
const { FileDeleteMessageBuilder } = require('./vscode.message.builder.js');

/**
 * Универсальная команда удаления файла или папки с обработкой ссылок
 * @param {{ fsPath: string }} uri
 */
async function ux_file_delete(uri) {
    if (!uri) return;

    const deletedPath = uri.fsPath;
    const targetName = path.basename(deletedPath);

    const projectRoot = getLanguageRoot(deletedPath);

    const isDirectory = fs.statSync(deletedPath).isDirectory();
    let references = await buildMdFileReferences(deletedPath, projectRoot);

    let message = new FileDeleteMessageBuilder(isDirectory, targetName).build(references);

    const confirm = await vscode.window.showWarningMessage(message, { modal: true }, 'Удалить');

    if (confirm !== 'Удалить') return;

    try {
        // Обновляем ссылки ДО удаления
        await updateLinksAfterDelete(references, deletedPath, projectRoot, '**удалено**');

        vscode.window.showInformationMessage(
            isDirectory ? `Папка "${targetName}" успешно удалена.` : `Файл "${targetName}" успешно удалён.`
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Ошибка удаления: ${msg}`);
    }
}

module.exports = { ux_file_delete };
