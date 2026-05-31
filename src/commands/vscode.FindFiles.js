const vscode = require('vscode');

/**
 * @param {string | vscode.Uri | vscode.WorkspaceFolder} rootDir
 */

async function FindMdFiles(rootDir) {
    return await vscode.workspace.findFiles(new vscode.RelativePattern(rootDir, '**/*.md'), '**/node_modules/**');
}
module.exports = { FindMdFiles };
