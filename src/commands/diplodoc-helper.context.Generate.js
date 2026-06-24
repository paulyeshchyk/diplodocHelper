// diplodoc-helper.generateContexts.js

const { nls_ts, translate } = require('../nls_ts.js');
const { runGeneration } = require('../plugins/contexts/сontexts');
const path = require('path');
let vscode = require('vscode');

async function ux_context_run_generation() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const DOCS_ROOT = path.join(projectRoot, 'docs');

    const results = runGeneration(DOCS_ROOT);

    if (results.success.length > 0) {
        const langs = results.success.join(', ');
        vscode.window.showInformationMessage(translate(nls_ts.plugin.context.generate.info.success, langs));
    } else {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.context.generate.error.notfound));
    }
}
module.exports = { ux_context_run_generation, runGeneration };
