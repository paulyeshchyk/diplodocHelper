// src/commands/diplodoc-helper.helptag.Delete.js

const { nls_ts, translate } = require('../nls_ts.js');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { isDiplodocSection } = require('../plugins/utils/path.directory.js');
const { frontmatterRemove, frontmatterParse } = require('../shared/context/frontmatter/frontmatter.facade.js');

/**
 * @param {{ fsPath: string }} uri
 */
async function ux_helptag_delete(uri) {
    if (!uri) return;

    const sectionPath = uri.fsPath;
    if (!isDiplodocSection(sectionPath)) {
        return; // silently
    }

    const indexMdPath = path.join(sectionPath, 'index.md');
    if (!fs.existsSync(indexMdPath)) return;

    let currentHelptag = readHelpTag(indexMdPath);

    if (!currentHelptag) {
        return; // silently - no helptag
    }

    const confirm = await vscode.window.showWarningMessage(
        translate(nls_ts.plugin.helptag.delete.confirm.title, currentHelptag),
        { modal: true },
        translate(nls_ts.plugin.helptag.delete.confirm.button)
    );

    if (confirm !== translate(nls_ts.plugin.helptag.delete.confirm.button)) return;

    try {
        let content = fs.readFileSync(indexMdPath, 'utf8');
        content = frontmatterRemove(content, 'helptag');

        fs.writeFileSync(indexMdPath, content, 'utf8');

        vscode.window.showInformationMessage(translate(nls_ts.plugin.helptag.delete.info.success, currentHelptag));
    } catch (err) {
        let msg = err instanceof Error ? err.message : `${err}`;
        vscode.window.showErrorMessage(translate(nls_ts.plugin.helptag.delete.error.critical, msg));
    }
}

/**
 * @param {fs.PathOrFileDescriptor} indexMdPath
 * @returns {string}
 */
function readHelpTag(indexMdPath) {
    try {
        const content = fs.readFileSync(indexMdPath, 'utf8');
        const { data } = frontmatterParse(content);
        return data.helptag || '';
    } catch {
        return '';
    }
}

module.exports = { ux_helptag_delete };
