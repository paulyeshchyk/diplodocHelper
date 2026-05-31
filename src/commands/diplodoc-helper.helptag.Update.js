// src/commands/diplodoc-helper.helptag.Update.js

const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { isDiplodocSection } = require('../plugins/utils/path.directory.js');
const { parse, update } = require('../plugins/utils/frontmatter.utils.js');

/**
 * @param {{ fsPath: string }} uri
 */
async function ux_helptag_update(uri) {
    if (!uri) return;

    const sectionPath = uri.fsPath;
    if (!isDiplodocSection(sectionPath)) {
        vscode.window.showWarningMessage(translate(nls_ts.plugin.helptag.update.error.incorrectSection));
        return;
    }

    const indexMdPath = path.join(sectionPath, 'index.md');
    let currentHelptag = '';

    if (fs.existsSync(indexMdPath)) {
        const content = fs.readFileSync(indexMdPath, 'utf8');
        const { data } = parse(content);
        currentHelptag = data.helptag || '';
    }

    const newHelptag = await vscode.window.showInputBox({
        prompt: translate(nls_ts.plugin.helptag.update.prompt.add),
        value: currentHelptag,
        placeHolder: translate(nls_ts.plugin.helptag.update.placeholder.add),
        validateInput: value => {
            if (!value || value.trim() === '') {
                return translate(nls_ts.plugin.helptag.update.error.empty);
            }
            return null;
        },
    });

    if (newHelptag === undefined) return;

    try {
        let content = fs.readFileSync(indexMdPath, 'utf8');
        content = update(content, 'helptag', newHelptag.trim());

        fs.writeFileSync(indexMdPath, content, 'utf8');

        const STipHelptagUpdated = translate(nls_ts.plugin.helptag.update.info.success, newHelptag);
        vscode.window.showInformationMessage(STipHelptagUpdated);
    } catch (err) {
        let msg = err instanceof Error ? err.message : `${err}`;
        const SErrorHelptagNotUpdated = translate(nls_ts.plugin.helptag.update.error.critical, msg);
        vscode.window.showErrorMessage(SErrorHelptagNotUpdated);
    }
}

module.exports = { ux_helptag_update };
