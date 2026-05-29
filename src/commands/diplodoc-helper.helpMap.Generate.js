// src/commands/generateHelpmap.js

const { nls_ts, translate } = require('../../nls_ts.js');
const path = require('path');
const vscode = require('vscode');

// Проверка наличия vscode
/**
 * @typedef {Object} HelpEntry
 * @property {string} url - Относительный путь к файлу без расширения
 * @property {string} title - Заголовок статьи
 * @property {string} hint - Подсказка из метаданных
 * @property {string} context - Значение тега helptag
 * @property {string} lang - Языковой код (ru, en и т.д.)
 * /
 
/** 
 * @typedef {Object} GenerationResults
 * @property {HelpEntry[]} success - Успешно обработанные записи
 * @property {string[]} failed - Пути к файлам, вызвавшим ошибку
 */

const outputFolderName = 'build';
const docsFolderName = 'docs';

const { runGeneration } = require('../plugins/helpMap/index.js');

/**
 * Вызов из VS Code (Команда расширения)
 */
async function generateHelpmap() {
    if (!vscode) return;

    // Если нажали в меню проводника, берем путь папки, иначе корень проекта
    const projectRoot = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
    const selectedPath = projectRoot; //uri ? uri.fsPath : projectRoot;

    if (!selectedPath) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.helpmap.generate.error.emptypath));
        return;
    }

    const options = {
        // Если вы хотите всегда сканировать /docs от корня проекта:
        docsDir: path.join(projectRoot, docsFolderName),
        // Или если хотите сканировать именно ту папку, на которой нажали ПКМ:
        // docsDir: selectedPath,
        outputDir: path.join(projectRoot, outputFolderName),
        segregation: false,
    };

    try {
        const results = runGeneration(options);
        if (results.success.length > 0) {
            vscode.window.showInformationMessage(
                translate(nls_ts.plugin.helpmap.generate.info.success, results.success.length, options.outputDir)
            );
        } else {
            vscode.window.showWarningMessage(
                translate(nls_ts.plugin.helpmap.generate.warning.nothingfound, options.docsDir)
            );
        }
    } catch (err) {
        let msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(translate(nls_ts.plugin.helpmap.generate.error.critical, msg));
    }
}

module.exports = { generateHelpmap };
