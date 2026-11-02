const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const installerConfig = require('../plugins/installer/installer.config.js');

/**
 * Валидирует выбранную папку на наличие структуры Diplodoc/YFM.
 * 
 * @param {string} targetDir 
 * @returns {{ isValid: boolean, isInsideDocs: boolean, missingMarkers: string[] }}
 */
function validateTargetDirectory(targetDir) {
    const hasPackageJson = fs.existsSync(path.join(targetDir, 'package.json'));
    const docsDir = path.join(targetDir, 'docs');
    const hasDocsFolder = fs.existsSync(docsDir) && fs.statSync(docsDir).isDirectory();

    // Проверяем маркерные файлы YFM/Diplodoc внутри docs
    const yfmMarkers = ['.yfm', 'presets.yaml', 'theme.yaml'];
    const hasYfmInDocs = hasDocsFolder && yfmMarkers.some(marker => fs.existsSync(path.join(docsDir, marker)));

    // Проверяем, не выбрал ли пользователь непосредственно папку docs
    const isInsideDocs = yfmMarkers.some(marker => fs.existsSync(path.join(targetDir, marker)));

    const isValid = (hasPackageJson || hasDocsFolder) && (hasYfmInDocs || isInsideDocs);
    
    const missingMarkers = [];
    if (!hasPackageJson) missingMarkers.push('package.json');
    if (!hasDocsFolder && !isInsideDocs) missingMarkers.push('папка docs/');

    return { isValid, isInsideDocs, missingMarkers };
}

/**
 * @param {string} src
 * @param {string} dest
 * @param {string[]} ignorePatterns
 */
function copyRecursiveSync(src, dest, ignorePatterns) {
    if (!src || !dest) {
        throw new Error(`Некорректные пути для копирования: src=${src}, dest=${dest}`);
    }

    const exists = fs.existsSync(src);
    const stats = fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(childItemName => {
            const childPath = path.join(src, childItemName);
            
            if (ignorePatterns && ignorePatterns.some((/** @type {string} */ pattern) => childItemName.includes(pattern))) {
                return;
            }
            
            copyRecursiveSync(childPath, path.join(dest, childItemName), ignorePatterns);
        });
    } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
    }
}

async function ux_install_scripts() {
    const extensionId = 'paulyestchick.diplodochelper'; 
    const extension = vscode.extensions.getExtension(extensionId);

    if (!extension) {
        vscode.window.showErrorMessage(`❌ Не удалось найти расширение с ID "${extensionId}".`);
        return;
    }

    const extensionPath = extension.extensionPath;

    // 1. Предварительное модальное окно с краткой инструкцией для ориентирования
    const guideChoice = await vscode.window.showInformationMessage(
        `📁 Инструкция по установке скриптов сборки\n\n` +
        `Вам потребуется выбрать КОРНЕВУЮ папку проекта Diplodoc/YFM.\n\n` +
        `Признаки правильной папки:\n` +
        `• Содержит файл package.json\n` +
        `• Содержит папку docs (внутри которой лежат .yfm, presets.yaml или папки ru/en)\n\n` +
        `Скрипты (plugins и server) будут скопированы прямо в выбранную директорию.`,
        { modal: true },
        'Выбрать папку'
    );

    // Если пользователь закрыл модалку или нажал встроенную "Отмена"
    if (guideChoice !== 'Выбрать папку') {
        return;
    }

    // 2. Открываем выбор директории
    const uri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Установить в эту папку',
        title: 'Выберите корень проекта Diplodoc'
    });

    if (!uri || uri.length === 0) return;
    let targetDir = uri[0].fsPath;

    // 3. Проверка и валидация
    let validation = validateTargetDirectory(targetDir);

    if (validation.isInsideDocs) {
        const parentDir = path.dirname(targetDir);
        const choice = await vscode.window.showWarningMessage(
            `Вы выбрали папку "docs". Установить плагины в корень проекта (${path.basename(parentDir)})?`,
            { modal: true },
            'Да, в корень проекта',
            'Оставить выбранную папку'
        );

        if (!choice) return;
        if (choice === 'Да, в корень проекта') {
            targetDir = parentDir;
            validation = validateTargetDirectory(targetDir);
        }
    }

    if (!validation.isValid) {
        const missingText = validation.missingMarkers.join(', ');
        const confirm = await vscode.window.showWarningMessage(
            `⚠️ Выбранная папка не похожа на корень проекта Diplodoc (не найдены: ${missingText}). Всё равно продолжить установку?`,
            { modal: true },
            'Установить всё равно'
        );

        if (confirm !== 'Установить всё равно') {
            return;
        }
    }

    // 4. Выполнение установки
    try {
        let copiedCount = 0;

        for (const item of installerConfig.items) {
            if (!item.src || !item.dest) continue;

            const srcPath = path.join(extensionPath, item.src);
            const destPath = path.join(targetDir, item.dest);

            if (!fs.existsSync(srcPath)) continue;

            copyRecursiveSync(srcPath, destPath, installerConfig.ignorePatterns);
            copiedCount++;
        }

        if (copiedCount > 0) {
            const action = await vscode.window.showInformationMessage(
                `✅ Скрипты (plugins, server) успешно установлены в:\n${targetDir}`,
                'Показать в проводнике'
            );

            if (action === 'Показать в проводнике') {
                vscode.env.openExternal(vscode.Uri.file(targetDir));
            }
        } else {
            vscode.window.showWarningMessage('⚠️ Ни один скрипт не был скопирован. Проверьте конфигурацию.');
        }

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`❌ Ошибка установки скриптов: ${msg}`);
    }
}

module.exports = { 
    ux_install_scripts,
    validateTargetDirectory 
};