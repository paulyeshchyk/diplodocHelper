// src/plugins/utils/link.utils.js

const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const { slugify_diplodoc_reference } = require('./encoding.slugify.js');

const INDEX_MD = 'index.md';

/**
 * Генерирует slug из заголовка
 * @param {string} text
 */
function generateSlug(text) {
    return slugify_diplodoc_reference(text);
}

/**
 * Извлекает якоря из Markdown-файла (заголовки, {#якоря}, HTML id)
 * @param {import("node:fs").PathLike | fs.FileHandle} filePath
 */
async function extractAnchorsFromMdFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const anchors = [];
        const seenAnchors = new Set();

        // Заголовки Markdown с явным {#anchor}
        const headingRegex = /^\s*(#{1,6})\s+(.+?)(?:\s*\{#([^}]+)\})?\s*$/gm;
        let match;
        while ((match = headingRegex.exec(content)) !== null) {
            const level = match[1].length;
            let title = match[2].trim();
            let explicitAnchor = match[3]?.trim();

            let anchor = explicitAnchor || generateSlug(title);
            if (!seenAnchors.has(anchor)) {
                seenAnchors.add(anchor);
                anchors.push({
                    label: `${'#'.repeat(level)} ${title}`,
                    anchor: anchor,
                });
            }
        }

        // HTML-атрибуты id
        const idRegex = /\bid\s*=\s*(["']?)([^"'\s>]+)\1/gi;
        let idMatch;
        while ((idMatch = idRegex.exec(content)) !== null) {
            const idValue = idMatch[2];
            if (!seenAnchors.has(idValue)) {
                seenAnchors.add(idValue);
                anchors.push({
                    label: `id: ${idValue}`,
                    anchor: idValue,
                });
            }
        }

        // <a name="...">
        const nameRegex = /<a\s+name\s*=\s*(["']?)([^"'\s>]+)\1/gi;
        let nameMatch;
        while ((nameMatch = nameRegex.exec(content)) !== null) {
            const nameValue = nameMatch[2];
            if (!seenAnchors.has(nameValue)) {
                seenAnchors.add(nameValue);
                anchors.push({
                    label: `name: ${nameValue}`,
                    anchor: nameValue,
                });
            }
        }

        return anchors;
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
