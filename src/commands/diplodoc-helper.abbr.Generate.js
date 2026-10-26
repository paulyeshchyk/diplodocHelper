const { runGeneration } = require('../plugins/abbrs/abbrs');
const path = require('path');
const vscode = require('vscode');

const DocsFolderName = 'docs';

async function ux_abbrs_generate() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const projectRoot = workspaceFolders[0].uri.fsPath;
    const docsRoot = path.join(projectRoot, DocsFolderName);

    const results = runGeneration(docsRoot);

    if (results.success.length > 0) {
        const langs = results.success.join(', ');
        vscode.window.showInformationMessage(`Сокращения собраны: ${langs}`);
    } else if (results.failed.length > 0) {
        vscode.window.showErrorMessage(
            `Не удалось собрать сокращения: ${results.failed.join(', ')}. См. лог расширения.`
        );
    } else {
        vscode.window.showWarningMessage('Сокращений не найдено ни в одном языке.');
    }
}

module.exports = { ux_abbrs_generate };
