const vscode = require('vscode');

/**
 * @param {string | vscode.Uri | vscode.WorkspaceFolder} rootDir
 */

async function FindMdFiles(rootDir) {
    return await vscode.workspace.findFiles(new vscode.RelativePattern(rootDir, '**/*.md'), '**/node_modules/**');
}

/**
 *
 * @returns {string | undefined}
 */
function getProjectRoot() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return !workspaceFolders ? undefined : workspaceFolders[0].uri.fsPath;
}

module.exports = { FindMdFiles, getProjectRoot };
