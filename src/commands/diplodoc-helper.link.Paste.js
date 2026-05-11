const vscode = require("vscode");
const path = require('path');

/**
 * Вычисляет относительный путь с кодированием
 */
function calculateRelativeMdPath(fromPath, toPath) {
    // Если целевой путь - папка, добавим index.md (стандарт Diplodoc)
    // Если это уже файл .md, оставляем как есть
    let targetFile = toPath;
    if (!toPath.endsWith('.md')) {
        targetFile = path.join(toPath, 'index.md');
    }

    let relPath = path.relative(path.dirname(fromPath), targetFile);
    relPath = relPath.split(path.sep).join('/');

    const encodedPath = relPath
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');

    return encodedPath.startsWith('.') ? encodedPath : './' + encodedPath;
}

async function pasteLink() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    try {
        const clipboardText = await vscode.env.clipboard.readText();
        const data = JSON.parse(clipboardText);

        if (!data.sourceLinkPath || !data.sourceLinkName) {
            throw new Error("В буфере нет данных для Diplodoc ссылки");
        }

        const isImage = data.isImage === true;
        const prefix = isImage ? "!" : ""; // Добавляем ! для картинок

        const sourceFilePath = editor.document.uri.fsPath;
        const targetFilePath = data.sourceLinkPath;

        const mdPath = calculateRelativeMdPath(sourceFilePath, targetFilePath);
        const linkText = `${prefix}[${data.sourceLinkName}](${mdPath})`;

        editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, linkText);
        });
    } catch (err) {
        // Если в буфере не JSON или не наши данные
        vscode.window.showErrorMessage("Не удалось вставить ссылку: проверьте, что вы её скопировали.");
    }
}

module.exports = { pasteLink };