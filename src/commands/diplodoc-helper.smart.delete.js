// src/commands/diplodoc-helper.smart.delete.js

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const { isDiplodocSection } = require('../plugins/utils/path.directory.js');
const { ux_section_delete } = require('./diplodoc-helper.section.Delete.js');
const { ux_file_delete } = require('./diplodoc-helper.file.Delete.js');

/**
 * Умная команда удаления — сама определяет, что именно удаляют
 * @param {{ fsPath: string }} uri
 */
async function ux_smart_delete(uri) {
    if (!uri) return;

    const targetPath = uri.fsPath;

    // 1. Проверяем, является ли это Diplodoc-секцией
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory() && isDiplodocSection(targetPath)) {
        return ux_section_delete(uri);
    }

    // 2. Во всех остальных случаях — обычное удаление файла/папки
    return ux_file_delete(uri);
}

module.exports = { ux_smart_delete };
