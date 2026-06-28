// src/commands/diplodoc-helper.section.Create.js

const { nls_ts, translate } = require('../nls_ts.js');
const vscode = require('vscode');
const { frontmatterCalculateNextIndex } = require('../plugins/shared/context/frontmatter/frontmatter.facade.index.js');
const { FrontMatterSectionTypesIndexed2 } = require('../plugins/model/frontmatter.model.js');
const { ShowSectionNameSelector, ShowSectionTypeSelector, promptSectionIndex } = require('./vscode.prompts.js');
const { isDiplodocSection, isLanguageRoot } = require('../plugins/shared/validators/diplodocDirectoryValidator.js');
const { createSectionFolder, diplodocCreateSection } = require('../plugins/utils/diplodoc.flow.js');

/**
 * @param {{ fsPath: any; }} uri
 */
async function ux_section_create(uri) {
    if (!uri) return;
    const targetDir = uri.fsPath;

    if (!isDiplodocSection(targetDir) && !isLanguageRoot(targetDir)) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.create.error.incorrectSection));
        return;
    }

    const sectionType = await ShowSectionTypeSelector();
    if (!sectionType) return;

    const userSectionName = await ShowSectionNameSelector();
    if (!userSectionName) return;

    const sectionIndex = await AskSectionIndex(sectionType, targetDir);

    /** @import {CreateFolderResult} from '../plugins/shared/validators/diplodocDirectoryValidator.js' */

    /** @type {CreateFolderResult?} */
    const folderResult = createSectionFolder(targetDir, sectionType, userSectionName, sectionIndex, message => {
        vscode.window.showErrorMessage(message);
    });
    if (!folderResult) return;

    try {
        diplodocCreateSection(folderResult, userSectionName, sectionType, sectionIndex, targetDir);

        vscode.window.showInformationMessage(
            translate(nls_ts.plugin.section.create.info.success, '', sectionType.label)
        );
    } catch (err) {
        let msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.create.error.critical, msg));
    }
}

/**
 * @param {import('../plugins/model/section.model.js').SectionTypeOption} sectionType
 * @param {string} targetDir
 */
async function AskSectionIndex(sectionType, targetDir) {
    const hasIndex = FrontMatterSectionTypesIndexed2.includes(sectionType.name);

    const sectionIndexCalculated = frontmatterCalculateNextIndex(targetDir);

    const sectionIndex = hasIndex ? await promptSectionIndex(sectionIndexCalculated) : '';
    return sectionIndex;
}

module.exports = { ux_section_create };
