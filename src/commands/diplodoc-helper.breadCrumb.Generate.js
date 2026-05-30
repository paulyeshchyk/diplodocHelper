// diplodoc-helper.breadCrumb.Generate.js

const { nls_ts, translate } = require('../../nls_ts.js');
const { runGeneration } = require('../plugins/breadcrumb/breadcrumb');
const path = require('path');
let vscode = require('vscode');

const BuildFolderName = 'build';

async function generateBreadcrumbs() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const BUILD_ROOT = path.join(projectRoot, '..', BuildFolderName).replace(/\\/g, '/');

    const results = runGeneration(BUILD_ROOT);

    if (results.success.length > 0) {
        vscode.window.showInformationMessage(
            translate(nls_ts.plugin.breadcrumb.generate.info.success, results.success.join(', '))
        );
    } else {
        vscode.window.showErrorMessage(
            translate(nls_ts.plugin.breadcrumb.generate.error.foldernotfound, results.failed.join(', ')),
            {
                modal: true,
                detail: translate(translate(nls_ts.plugin.breadcrumb.generate.error.detail)),
            }
        );
    }
}
module.exports = { generateBreadcrumbs, runGeneration };
