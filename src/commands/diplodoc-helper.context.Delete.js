// src/commands/diplodoc-helper.context.Delete.js

const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { isDiplodocSection } = require('../plugins/utils/path.directory.js');
const { parse, stringify, remove } = require('../plugins/utils/frontmatter.utils.js');

/**
 * @param {{ fsPath: string }} uri
 */
async function ux_context_delete(uri) {
    if (!uri) return;

    const sectionPath = uri.fsPath;
    if (!isDiplodocSection(sectionPath)) return;

    const indexMdPath = path.join(sectionPath, 'index.md');
    if (!fs.existsSync(indexMdPath)) return;

    let contexts = readContexts(indexMdPath);

    if (contexts.length === 0) return; // ничего не делаем

    let toDelete;

    if (contexts.length === 1) {
        toDelete = contexts[0];
    } else {
        toDelete = await vscode.window.showQuickPick(contexts, {
            placeHolder: translate(nls_ts.plugin.context.delete.dialog.placeholder),
        });
        if (!toDelete) return;
    }

    const confirm = await vscode.window.showWarningMessage(
        translate(nls_ts.plugin.context.delete.confirm.prompt, toDelete),
        { modal: true },
        translate(nls_ts.plugin.context.delete.confirm.button)
    );

    if (confirm !== translate(nls_ts.plugin.context.delete.confirm.button)) return;

    try {
        let content = fs.readFileSync(indexMdPath, 'utf8');
        const { data, content: body } = parse(content);

        const remaining = contexts.filter((/** @type {any} */ c) => c !== toDelete);

        if (remaining.length === 0) {
            content = remove(content, 'context');
        } else {
            data.context = remaining.join(', ');
            content = stringify(data, body);
        }

        fs.writeFileSync(indexMdPath, content, 'utf8');

        vscode.window.showInformationMessage(translate(nls_ts.plugin.context.delete.info.success, toDelete));
    } catch (err) {
        let msg = err instanceof Error ? err.message : `${err}`;
        vscode.window.showErrorMessage(translate(nls_ts.plugin.context.delete.error.critical, msg));
    }
}

/**
 * @param {fs.PathOrFileDescriptor} indexMdPath
 * @returns string[]
 */
function readContexts(indexMdPath) {
    try {
        const content = fs.readFileSync(indexMdPath, 'utf8');
        const { data } = parse(content);
        const current = data.context || '';
        return current
            .split(',')
            .map((/** @type {string} */ s) => s.trim())
            .filter(Boolean);
    } catch {
        return [];
    }
}

module.exports = { ux_context_delete };
