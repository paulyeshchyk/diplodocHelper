// src/plugins/utils/link.utils.js

const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const { Url_Transform_Reference } = require('./url/Url_Transform_Reference.ts');
const { Link_Read_Anchors } = require('./link/Link_Read_Anchors.ts');

const INDEX_MD = 'index.md';

/**
 * @deprecated Импортируйте `Url_Transform_Reference.slugify` напрямую.
 * Shim сохранён для внутренних потребителей (`extractAnchorsFromMdFile`).
 *
 * Regression: 00.6.3#18, #19.
 */
const generateSlug = Url_Transform_Reference.slugify;

/**
 * Извлекает якоря из Markdown-файла (заголовки, {#якоря}, HTML id)
 * @param {import("node:fs").PathLike | fs.FileHandle} filePath
 */
async function extractAnchorsFromMdFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return Link_Read_Anchors.extract(content, generateSlug);
    } catch {
        return [];
    }
}

/**
 * Диалог выбора якоря (с возможностью ручного ввода)
 * @param {any[]} anchors
 * @param {(arg0: string) => any} translateFn
 */
async function promptAnchorSelection(anchors, translateFn) {
    const quickPickItems = anchors.map((/** @type {{ label: any; anchor: any; }} */ item) => ({
        label: item.label,
        description: `#${item.anchor}`,
        anchor: item.anchor,
    }));

    quickPickItems.push({
        label: translateFn('plugin.link.paste.anchor.quickPick.label') || 'Ввести вручную',
        description: translateFn('plugin.link.paste.anchor.quickPick.description') || '...',
        anchor: '__CUSTOM__',
    });

    const selected = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: translateFn('plugin.link.paste.anchor.select') || 'Выберите якорь',
        matchOnDescription: true,
    });

    if (!selected) return undefined;

    if (selected.anchor === '__CUSTOM__') {
        const customAnchor = await vscode.window.showInputBox({
            prompt: translateFn('plugin.link.paste.anchor.input.prompt') || 'Введите якорь',
            placeHolder: translateFn('plugin.link.paste.anchor.input.placeHolder') || 'my-anchor',
            validateInput: value => {
                if (!value || value.trim() === '') {
                    return (
                        translateFn('plugin.link.paste.anchor.input.validate.error.emptyAnchor') ||
                        'Якорь не может быть пустым'
                    );
                }
                if (/\s/.test(value)) {
                    return (
                        translateFn('plugin.link.paste.anchor.input.validate.error.incorrectCharacters') ||
                        'Якорь не должен содержать пробелов'
                    );
                }
                return null;
            },
        });
        return customAnchor?.trim();
    }

    return selected.anchor;
}

/**
 * Вычисляет относительный путь с кодированием
 * @param {string} fromPath
 * @param {string} toPath
 * @param {string | boolean} addIndex
 */
function calculateRelativeMdPath(fromPath, toPath, addIndex) {
    let targetFile = toPath;
    if (addIndex && !targetFile.endsWith('.md')) {
        targetFile = path.join(targetFile, INDEX_MD);
    }

    let relPath = path.relative(path.dirname(fromPath), targetFile);
    relPath = relPath.split(path.sep).join('/');

    const encodedPath = relPath
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');

    return encodedPath.startsWith('.') ? encodedPath : './' + encodedPath;
}

module.exports = {
    generateSlug,
    extractAnchorsFromMdFile,
    promptAnchorSelection,
    calculateRelativeMdPath,
    INDEX_MD,
};
