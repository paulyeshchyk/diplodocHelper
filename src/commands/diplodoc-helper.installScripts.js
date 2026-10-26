const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// Загружаем конфиг установщика
const installerConfig = require('../plugins/installer/installer.config.js');

/**
 * Рекурсивное копирование с игнорированием ненужных файлов
 * @param {string} src
 * @param {string} dest
 * @param {any[]} ignorePatterns
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
            
            // Проверка на игнорирование
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
    // 1. Получаем ID расширения из package.json
    // ВАЖНО: Замените 'paulyestchick.diplodoc-helper' на ваш реальный ID (publisher.name)
    const extensionId = 'paulyestchick.diplodochelper'; 
    const extension = vscode.extensions.getExtension(extensionId);

    if (!extension) {
        vscode.window.showErrorMessage(`❌ Не удалось найти расширение с ID "${extensionId}".`);
        return;
    }

    const extensionPath = extension.extensionPath;

    // 2. Просим пользователя выбрать папку назначения
    const uri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Выбрать папку для установки скриптов',
        title: 'Куда установить скрипты сборки?'
    });

    if (!uri || uri.length === 0) return;
    const targetDir = uri[0].fsPath;

    try {
        let copiedCount = 0;

        // 3. Проходимся по конфигу и копируем
        for (const item of installerConfig.items) {
            if (!item.src || !item.dest) {
                console.warn(`[Installer] Пропущен элемент конфига без src или dest`, item);
                continue;
            }

            const srcPath = path.join(extensionPath, item.src);
            const destPath = path.join(targetDir, item.dest);

            if (!fs.existsSync(srcPath)) {
                console.warn(`[Installer] Источник не найден: ${srcPath}`);
                continue;
            }

            copyRecursiveSync(srcPath, destPath, installerConfig.ignorePatterns);
            copiedCount++;
        }

        if (copiedCount > 0) {
            vscode.window.showInformationMessage(`✅ Скрипты успешно установлены в ${targetDir}`);
        } else {
            vscode.window.showWarningMessage('⚠️ Ни один скрипт не был скопирован. Проверьте конфигурацию.');
        }

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`❌ Ошибка установки скриптов: ${msg}`);
    }
}

module.exports = { ux_install_scripts };