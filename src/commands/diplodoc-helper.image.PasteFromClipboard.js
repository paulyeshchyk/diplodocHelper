//diplodoc-helper.image.PasteFromClipboard.js

const { nls_ts, translate } = require('../../nls_ts.js');
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getImageFromClipboard } = require('../plugins/utils/clipboard.image');
const { buildFigure, buildFigureId } = require('../plugins/utils/md.links.figure.js');
const { slugify_latin_alphanumeric } = require('../plugins/utils/encoding.slugify.js');

const imageExtension = '.png';

/**
 * Основная команда
 */
async function ux_image_paste_clipboard() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage(translate(nls_ts.paste.image.error.noactiveeditor));
        return;
    }

    const document = editor.document;
    if (document.languageId !== 'markdown') {
        vscode.window.showWarningMessage(translate(nls_ts.paste.image.warning.mdfileonly));
        return;
    }

    const clipboardImage = await getImageFromClipboard();
    if (!clipboardImage) {
        vscode.window.showWarningMessage(translate(nls_ts.paste.image.warning.emptybuffer));
        return;
    }

    const mdDir = path.dirname(document.uri.fsPath);
    const imagesDir = path.join(mdDir, 'images');

    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    const defaultFilename = translate(nls_ts.screenshot.name.prompt, timestamp);

    // 1. Запрашиваем имя у пользователя
    const userInput = await vscode.window.showInputBox({
        prompt: translate(nls_ts.screenshot.name.prompt),
        placeHolder: translate(nls_ts.screenshot.description.placeholder),
        value: defaultFilename,
        validateInput: value => {
            if (!value || value.trim().length === 0) {
                return 'Имя не может быть пустым';
            }
            const cleanName = slugify_latin_alphanumeric(value);
            if (cleanName.length === 0) {
                return translate(nls_ts.screenshot.name.error.wrongcharacters);
            }
            const testPath = path.join(imagesDir, `${cleanName}${imageExtension}`);
            if (fs.existsSync(testPath)) {
                return translate(nls_ts.filename.error.alreadyexists);
            }
            return null;
        },
    });

    if (!userInput) return;

    // === Основная логика ===
    const cleanName = slugify_latin_alphanumeric(userInput);
    const fileName = `${cleanName}.png`;
    const imagePath = path.join(imagesDir, fileName);

    try {
        if (fs.existsSync(imagePath)) {
            throw new Error(translate(nls_ts.screenshot.error.alreadyexists.async));
        }

        fs.writeFileSync(imagePath, clipboardImage);

        // Относительный путь
        let relativePath = path.relative(mdDir, imagePath).replace(/\\/g, '/');
        if (!relativePath.startsWith('.')) {
            relativePath = './' + relativePath;
        }

        // Alt-текст – введённое пользователем имя (оригинал, не очищенный)
        const altText = userInput.trim();

        // customId генерируем из очищенного имени (латиница + подчёркивания)
        const customId = buildFigureId(cleanName);

        const figureBlock = buildFigure(relativePath, altText, customId);

        await editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, figureBlock);
        });

        vscode.window.showInformationMessage(translate(nls_ts.screenshot.saved.info, fileName));
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(translate(nls_ts.screenshot.error.notsaved, msg));
    }
}

module.exports = { ux_image_paste_clipboard };
