// src/commands/diplodoc-helper.section.Create.js

const { nls_ts, translate } = require('../nls_ts.js');
const vscode = require('vscode');
const { calculateNextIndex } = require('../plugins/reindexer/reindexer.md.js');
const { FrontMatterSectionTypesIndexed2 } = require('../plugins/model/frontmatter.model.js');
const { composeFullTitle } = require('../plugins/utils/frontmatter.section.title.js');
const { ShowSectionNameSelector, ShowSectionTypeSelector, promptSectionIndex } = require('./vscode.prompts.js');
const { isDiplodocSection, isLanguageRoot } = require('../plugins/utils/path.directory.js');
const { createSectionFolder } = require('../plugins/utils/diplodoc.flow.js');
const {
    IndexYamlFileCreate,
    TocYamlFileCreate,
    IndexMdFileCreate,
    TocYamlEntryPatchItems,
} = require('../plugins/utils/yaml.base.js');

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

    const hasIndex = FrontMatterSectionTypesIndexed2.includes(sectionType.name);

    const sectionIndexCalculated = calculateNextIndex(targetDir);

    const sectionIndex = hasIndex ? await promptSectionIndex(sectionIndexCalculated) : '';

    /** @import {CreateFolderResult} from '../plugins/utils/path.directory.js' */

    /** @type {CreateFolderResult?} */
    const folderResult = createSectionFolder(targetDir, sectionType, userSectionName, sectionIndex, message => {
        vscode.window.showErrorMessage(message);
    });
    if (!folderResult) return;

    const fullTitle = composeFullTitle(sectionIndex, sectionType, userSectionName);

    try {
        IndexMdFileCreate(folderResult.folderPath, userSectionName, sectionType.name, sectionType.value, sectionIndex);

        IndexYamlFileCreate(
            folderResult.folderPath,
            userSectionName,
            sectionType.name,
            sectionType.value,
            sectionIndex
        );

        TocYamlFileCreate(folderResult.folderPath, userSectionName, sectionType.value, sectionIndex);

        TocYamlEntryPatchItems(targetDir, fullTitle, sectionType.value, folderResult.folderName, sectionIndex);

        vscode.window.showInformationMessage(
            translate(nls_ts.plugin.section.create.info.success, fullTitle, sectionType.label)
        );
    } catch (err) {
        let msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(translate(nls_ts.plugin.section.create.error.critical, msg));
    }
}

module.exports = { ux_section_create };
