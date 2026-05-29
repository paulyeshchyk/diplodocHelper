// src/commands/diplodoc-helper.context.Update.js

const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { isDiplodocSection } = require('../plugins/utils/directory.js');
const { parse, stringify } = require('../plugins/utils/frontmatter');

/**
 * @typedef {Object} ContextDto
 * @property {any} label
 * @property {string} action
 * @property {any} [value]
 */

/**
 * Надёжно парсит строку в массив контекстов.
 * Поддерживает запятые, пробелы, несколько разделителей подряд.
 * Пустые значения игнорируются.
 * @param {string} input
 * @returns {string[]}
 */
function parseContexts(input) {
    if (!input || typeof input !== 'string') return [];

    return input
        .split(/[\s,]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

/**
 * @param {{ fsPath: string }} uri
 */
async function updateContext(uri) {
    if (!uri) return;

    const sectionPath = uri.fsPath;
    if (!isDiplodocSection(sectionPath)) {
        vscode.window.showWarningMessage(translate(nls_ts.plugin.context.update.error.incorrectSection));
        return;
    }

    const indexMdPath = path.join(sectionPath, 'index.md');

    /**
     * @type {any[]}
     */
    let currentContexts = [];
    if (fs.existsSync(indexMdPath)) {
        const content = fs.readFileSync(indexMdPath, 'utf8');
        const { data } = parse(content);
        currentContexts = parseContexts(data.context || '');
    }

    let finalContexts = [...currentContexts];

    if (currentContexts.length === 0) {
        // Создание первого контекста
        const input = await vscode.window.showInputBox({
            prompt: translate(nls_ts.plugin.context.update.new.prompt),
            placeHolder: translate(nls_ts.plugin.context.update.new.placeholder),
            validateInput: v =>
                parseContexts(v).length === 0 ? translate(nls_ts.plugin.context.update.new.error.empty) : null,
        });

        if (!input) return;
        finalContexts = parseContexts(input);
    } else {
        /** @type {ContextDto[]} */
        const options = [
            {
                label: translate(nls_ts.plugin.context.update.new.addnewcontext),
                action: 'add',
            },
            ...currentContexts.map(ctx => ({
                label: ctx,
                action: 'edit',
                value: ctx,
            })),
        ];

        /** @type {ContextDto | undefined} */
        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: translate(nls_ts.plugin.context.update.new.actionplaceholder),
        });

        if (!selected) return;

        if (selected.action === 'add') {
            const input = await vscode.window.showInputBox({
                prompt: translate(nls_ts.plugin.context.update.new.add.inputprompt),
                placeHolder: translate(nls_ts.plugin.context.update.new.add.inputplaceholder),
            });

            if (!input) return;
            const newOnes = parseContexts(input);

            for (const item of newOnes) {
                if (!finalContexts.includes(item)) {
                    finalContexts.push(item);
                }
            }
        } else {
            // Редактирование
            const oldValue = selected.value;
            if (!oldValue) return;

            const newInput = await vscode.window.showInputBox({
                prompt: translate(nls_ts.plugin.context.update.change.inputprompt, oldValue),
                value: oldValue,
                validateInput: v =>
                    parseContexts(v).length === 0
                        ? translate(nls_ts.plugin.context.update.change.error.validation)
                        : null,
            });

            if (newInput === undefined) return;

            const newParsed = parseContexts(newInput);

            finalContexts = finalContexts.filter(c => c !== oldValue);
            for (const item of newParsed) {
                if (!finalContexts.includes(item)) {
                    finalContexts.push(item);
                }
            }
        }
    }

    if (finalContexts.length === 0) return;

    const finalString = finalContexts.join(', ');

    try {
        let content = fs.readFileSync(indexMdPath, 'utf8');
        const { data, content: body } = parse(content);

        data.context = finalString;
        const updatedContent = stringify(data, body);

        fs.writeFileSync(indexMdPath, updatedContent, 'utf8');

        vscode.window.showInformationMessage(translate(nls_ts.plugin.context.update.info.success, finalString));
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(translate(nls_ts.plugin.context.update.error.critical, msg));
    }
}

module.exports = { updateContext };
