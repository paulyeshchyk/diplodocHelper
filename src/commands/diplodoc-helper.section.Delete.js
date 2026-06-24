// src/commands/diplodoc-helper.section.Delete.js

const { nls_ts, translate } = require('../nls_ts.js');
const vscode = require('vscode');
const path = require('path');

const { isDiplodocSection } = require('../plugins/utils/path.directory.js');
const { TocYamlEntryRemove } = require('../plugins/utils/yaml.toc.entry.js');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');
const { updateLinksAfterDelete } = require('./diplodoc-helper.links.md.js');
const { findReferencesToMdSection } = require('./diplodoc-helper.file.md.js');
const { SectionDeleteMessageBuilder } = require('./vscode.message.builder.js');

/** @import {Reference} from './diplodoc-helper.files.js' */

/**
 * @param {{ fsPath: string }} uri
 */
async function ux_section_delete(uri) {
    if (!uri) return;

    const targetDir = uri.fsPath;
    const folderName = path.basename(targetDir);
    const parentDir = path.dirname(targetDir);

    if (!isDiplodocSection(targetDir)) {
        vscode.window.showWarningMessage(translate(nls_ts.plugin.section.delete.error.incorrectSection));
        return;
    }

    const projectRoot = getLanguageRoot(parentDir);

    /** @type {Array<Reference>} */
    let references = [];
    try {
        references = await findReferencesToMdSection(targetDir, projectRoot);
    } catch (err) {
        console.warn('Ошибка поиска ссылок:', err);
    }

    // Формирование сообщения
    let message = new SectionDeleteMessageBuilder(folderName).build(references);

    const confirm = await vscode.window.showWarningMessage(
        message,
        { modal: true },
        translate(nls_ts.plugin.section.delete.confirmation.title)
    );

    if (confirm !== translate(nls_ts.plugin.section.delete.confirmation.title)) return;

    try {
        TocYamlEntryRemove(parentDir, folderName);

        await updateLinksAfterDelete(references, targetDir, projectRoot, '**удалено**');

        vscode.window.showInformationMessage(translate(nls_ts.plugin.section.delete.info.success, folderName));
    } catch (err) {
        let msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.delete.error.critical, msg));
    }
}

module.exports = { ux_section_delete };
