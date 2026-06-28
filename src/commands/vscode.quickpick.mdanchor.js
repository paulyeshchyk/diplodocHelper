const { translate, nls_ts } = require('../nls_ts');
const { isDiplodocSection } = require('../plugins/shared/validators/diplodocDirectoryValidator');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
/**
 * Выбор позиции вставки
 * @param {string} targetDir
 * @param {string} movingSectionName
 * @returns {Promise<import('../plugins/utils/yaml.toc.entry.js').InsertTocPosition | null>}
 */
async function selectInsertPosition(targetDir, movingSectionName) {
    const items = fs
        .readdirSync(targetDir, { withFileTypes: true })
        .filter(e => e.isDirectory() && isDiplodocSection(path.join(targetDir, e.name)) && e.name !== movingSectionName)
        .map(e => ({
            label: translate(nls_ts.plugin.section.move.label.after, e.name),
            description: '',
            position: 'after',
            afterName: e.name,
        }));

    const options = [
        {
            label: translate(nls_ts.plugin.section.move.placeholder.start),
            position: 'start',
        },
        ...items,
        {
            label: translate(nls_ts.plugin.section.move.placeholder.end),
            position: 'end',
        },
    ];

    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: translate(nls_ts.plugin.section.move.placeholder.target, movingSectionName),
    });

    return selected || null;
}

module.exports = { selectInsertPosition };
