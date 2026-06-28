// src/commands/generateHelpmap.js

const { nls_ts, translate } = require('../nls_ts.js');
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

const { runGeneration, buildGenerationOptions } = require('../plugins/helpMap/helpmap.js');
const { getProjectRoot } = require('./vscode.FindFiles.js');

/**
 * Вызов из VS Code (Команда расширения)
 */
async function ux_helpmap_generate() {
    if (!vscode) return;

    const projectRoot = getProjectRoot();

    if (!projectRoot) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.helpmap.generate.error.emptypath));
        return;
    }

    const options = buildGenerationOptions(projectRoot);

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

module.exports = { ux_helpmap_generate };
