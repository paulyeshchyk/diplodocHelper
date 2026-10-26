const { runGeneration } = require('../plugins/terms/terms');
const path = require('path');
const vscode = require('vscode');

const DocsFolderName = 'docs';

async function ux_terms_generate() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const projectRoot = workspaceFolders[0].uri.fsPath;
    const docsRoot = path.join(projectRoot, DocsFolderName);

    const results = runGeneration(docsRoot);

    if (results.success.length > 0) {
        const langs = results.success.join(', ');
        vscode.window.showInformationMessage(`Термины собраны: ${langs}`);
    } else if (results.failed.length > 0) {
        vscode.window.showErrorMessage(
            `Не удалось собрать термины: ${results.failed.join(', ')}. См. лог расширения.`
        );
    } else {
        vscode.window.showWarningMessage('Терминов не найдено ни в одном языке.');
    }
}

module.exports = { ux_terms_generate };