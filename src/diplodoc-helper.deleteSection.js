// diplodoc-helper.deleteSection.js
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * Удаляет запись о разделе из родительского toc.yaml
 * Использует регулярное выражение для поиска блока по имени папки (href)
 * @param {string} parentDir 
 * @param {string} folderName 
 */
function unpatchParentToc(parentDir, folderName) {
    const tocPath = path.join(parentDir, 'toc.yaml');
    if (!fs.existsSync(tocPath)) return;

    let content = fs.readFileSync(tocPath, 'utf8');
    
    /**
     * Регулярное выражение ищет блок, начинающийся с дефиса, 
     * который содержит href, указывающий на папку удаляемого раздела.
     * Оно захватывает:
     * - name
     * - href
     * - возможный блок include (path и mode)
     */
    const sectionRegex = new RegExp(
        `\\s*-\\s+name:.*\\r?\\n\\s+href:\\s+${folderName}/index\\.md(?:\\r?\\n\\s+include:\\r?\\n\\s+path:\\s+${folderName}/toc\\.yaml\\r?\\n\\s+mode:\\s+link)?`,
        'g'
    );

    const newContent = content.replace(sectionRegex, '');
    
    // Если контент изменился — записываем
    if (content !== newContent) {
        fs.writeFileSync(tocPath, newContent.trimEnd() + '\n', 'utf8');
    }
}

const { isDiplodocSection } = require('./diplodoc-helper.utils');

/**
 * Основная функция удаления раздела
 * @param {{ fsPath: string; }} uri 
 */
async function deleteSection(uri) {
    if (!uri) return;

    const targetDir = uri.fsPath;
    const folderName = path.basename(targetDir);
    const parentDir = path.dirname(targetDir);

    // 1. Проверка: является ли это разделом?
    if (!isDiplodocSection(targetDir)) {
        vscode.window.showWarningMessage(
            "Выбранная папка не является разделом (отсутствуют index.md, index.yaml или toc.yaml). Воспользуйтесь стандартным удалением VS Code."
        );
        return;
    }

    // 2. Подтверждение удаления
    const confirm = await vscode.window.showWarningMessage(
        `Вы действительно хотите БЕЗВОЗВРАТНО удалить раздел "${folderName}" и все его содержимое?`,
        { modal: true }, // Модальное окно заставляет техписа осознанно нажать кнопку
        "Удалить"
    );

    if (confirm !== "Удалить") return;

    try {
        // 3. Убираем ссылку из родительского оглавления
        unpatchParentToc(parentDir, folderName);

        // 4. Рекурсивное удаление папки
        fs.rmSync(targetDir, { recursive: true, force: true });

        vscode.window.showInformationMessage(`Раздел "${folderName}" и упоминания в оглавлении удалены.`);
    } catch (err) {
        if (err instanceof Error)
            vscode.window.showErrorMessage(`Ошибка при удалении: ${err.message}`);
    }
}

module.exports = { deleteSection };