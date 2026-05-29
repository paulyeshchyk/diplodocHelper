// src/commands/diplodoc-helper.section.Create.js

const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');
const { calculateNextIndex } = require('../plugins/reindexer/reindexMD.js');
const { IndexMdFileCreate } = require('../plugins/utils/index.md.file.js');
const { IndexYamlFileCreate } = require('../plugins/utils/index.yaml.file.js');
const { TocYamlFileCreate } = require('../plugins/utils/toc.yaml.file.js');
const { TocYamlEntryPatchItems } = require('../plugins/utils/toc.yaml.entry.js');
const { FrontMatterSectionTypesIndexed } = require('../plugins/utils/constants');
const { composeFullTitle } = require('../plugins/utils/sectionTitle');
const { ShowSectionNameSelector, ShowSectionTypeSelector, promptSectionIndex } = require('../plugins/utils/prompts.js');
const { isDiplodocSection, isLanguageRoot } = require('../plugins/utils/directory.js');
const { createSectionFolder } = require('../plugins/utils/diplodoc.flow.js');

/**
 * @param {{ fsPath: any; }} uri
 */
async function createSection(uri) {
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

    const hasIndex = FrontMatterSectionTypesIndexed.includes(sectionType.name);

    const sectionIndexCalculated = calculateNextIndex(targetDir);

    const sectionIndex = hasIndex ? await promptSectionIndex(sectionIndexCalculated) : '';

    /** @import {CreateFolderResult} from '../plugins/utils/directory' */

    /** @type {CreateFolderResult?} */
    const folderResult = createSectionFolder(targetDir, sectionType, userSectionName, sectionIndex);
    if (!folderResult) return;

    const fullTitle = composeFullTitle(sectionIndex, sectionType, userSectionName);

    try {
        IndexMdFileCreate(folderResult.folderPath, fullTitle, sectionType.name, sectionType.value, sectionIndex);

        IndexYamlFileCreate(folderResult.folderPath, fullTitle, sectionType.name, sectionType.value, sectionIndex);

        TocYamlFileCreate(folderResult.folderPath, fullTitle, sectionType.value, sectionIndex);

        TocYamlEntryPatchItems(targetDir, fullTitle, sectionType.value, folderResult.folderName, sectionIndex);

        vscode.window.showInformationMessage(
            translate(nls_ts.plugin.section.create.info.success, fullTitle, sectionType.label)
        );
    } catch (err) {
        let msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.create.error.critical, msg));
    }
}

module.exports = { createSection };
