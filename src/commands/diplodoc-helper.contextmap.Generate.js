'use strict';

const path = require('node:path');
const vscode = require('vscode');
const { generateBytesCounterPage } = require('../plugins/reportPeriodicTable/report.ts');
const { generateContextsPage } = require('../plugins/reportPeriodicTableContext/report.ts');
const { generateHelpTagPage } = require('../plugins/reportPeriodicTableHelpTag/report.ts');

const BuildFolderName = 'build';

async function ux_contextmap_generate() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showWarningMessage('Откройте папку проекта документации.');
        return;
    }
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const BUILD_ROOT = path.join(projectRoot, BuildFolderName).replace(/\\/g, '/');

    try {
        generateBytesCounterPage({
            mapDir: BUILD_ROOT,
            outputDir: BUILD_ROOT,
            lang: ['ru', 'en'],
        });
        generateContextsPage({
            mapDir: BUILD_ROOT,
            outputDir: BUILD_ROOT,
            lang: ['ru', 'en'],
        });
        generateHelpTagPage({
            mapDir: BUILD_ROOT,
            outputDir: BUILD_ROOT,
            lang: ['ru', 'en'],
        });
        vscode.window.showInformationMessage(
            'Отчёты сгенерированы: bytescounter.html, contextmap.html, helptagmap.html'
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Ошибка генерации отчётов: ${msg}`);
    }
}

/**
 * @param {vscode.Uri} template_path
 */
async function export_template(template_path) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const BUILD_ROOT = path.join(projectRoot, BuildFolderName).replace(/\\/g, '/');

    try {
        const targetUri = vscode.Uri.file(path.join(BUILD_ROOT, 'page-template.html'));
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(BUILD_ROOT));
        await vscode.workspace.fs.copy(template_path, targetUri, { overwrite: true });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Ошибка при экспорте шаблона: ${msg}`);
    }
}

module.exports = { ux_contextmap_generate, export_template };