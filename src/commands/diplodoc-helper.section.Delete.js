// src/commands/diplodoc-helper.section.Delete.js
const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { isDiplodocSection } = require('../plugins/utils/directory.js');
const { TocYamlEntryRemove } = require('../plugins/utils/toc.yaml.entry.js');

/**
 * @param {{ fsPath: string }} uri
 */
async function deleteSection(uri) {
    if (!uri) return;

    const targetDir = uri.fsPath;
    const folderName = path.basename(targetDir);
    const parentDir = path.dirname(targetDir);

    if (!isDiplodocSection(targetDir)) {
        vscode.window.showWarningMessage(translate(nls_ts.plugin.section.delete.error.incorrectSection));
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        translate(nls_ts.plugin.section.delete.confirmation.text, folderName),
        { modal: true },
        translate(nls_ts.plugin.section.delete.confirmation.title)
    );

    if (confirm !== translate(nls_ts.plugin.section.delete.confirmation.title)) return;

    try {
        TocYamlEntryRemove(parentDir, folderName);
        fs.rmSync(targetDir, { recursive: true, force: true });

        vscode.window.showInformationMessage(translate(nls_ts.plugin.section.delete.info.success, folderName));
    } catch (err) {
        let msg = err instanceof Error ? err.message : `${err}`;
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.delete.error.critical, msg));
    }
}

module.exports = { deleteSection };
