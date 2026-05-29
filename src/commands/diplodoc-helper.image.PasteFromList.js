const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} FigureInfo
 * @property {string} id
 * @property {string} caption
 * @property {string} filePath
 * @property {string} label          // для отображения в QuickPick
 */

/**
 * @returns { Promise<void>}
 */
async function pasteImageFromListAsync() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('Команду можно использовать только в Markdown-файлах');
        return;
    }

    const currentFilePath = editor.document.uri.fsPath;
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
        vscode.window.showErrorMessage('Рабочая папка не найдена');
        return;
    }

    const rootDir = workspaceFolders[0].uri.fsPath;

    // 1. Собираем все рисунки
    const figures = await collectAllFigures(rootDir);

    if (figures.length === 0) {
        vscode.window.showInformationMessage('Не найдено ни одного рисунка с figcaption class="imageDescription"');
        return;
    }

    let seeAlso = 'см. ';

    // 2. Показываем QuickPick
    const selected = await vscode.window.showQuickPick(
        figures.map(f => ({
            label: f.caption,
            description: path.relative(rootDir, f.filePath),
            // detail: `ID: ${f.id}`,
            figure: f,
        })),
        {
            placeHolder: 'Выберите рисунок, на который хотите сослаться...',
            matchOnDescription: true,
            matchOnDetail: true,
        }
    );

    if (!selected) return;

    const { figure } = selected;

    // 3. Вычисляем относительный путь + якорь
    //const targetDir = path.dirname(figure.filePath);
    let relativePath = path.relative(path.dirname(currentFilePath), figure.filePath).replace(/\\/g, '/');

    if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
    }

    const linkText = figure.caption; // "Рисунок 42. Описание окна"
    const linkTarget = `${relativePath}#${figure.id}`;

    const markdownLink = `${seeAlso}[*${linkText}*](${linkTarget})`;

    // 4. Вставляем в редактор
    await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.active, markdownLink);
    });

    vscode.window.showInformationMessage(`Вставлена ссылка на: ${linkText}`);
}
/**
 * Сканирует все .md файлы и собирает информацию о рисунках
 * @param {string} rootDir
 * @returns {Promise<FigureInfo[]>}
 */
async function collectAllFigures(rootDir) {
    const figures = [];

    const mdFiles = await vscode.workspace.findFiles(
        new vscode.RelativePattern(rootDir, '**/*.md'),
        '**/node_modules/**'
    );

    const regex = /<figcaption\s+class="imageDescription"[^>]*?\bid="([^"]+)"[^>]*?>([\s\S]*?)<\/figcaption>/gi;

    for (const fileUri of mdFiles) {
        try {
            const content = await fs.promises.readFile(fileUri.fsPath, 'utf8');
            let match;

            while ((match = regex.exec(content)) !== null) {
                const id = match[1].trim();
                let caption = match[2].trim();

                // Очищаем возможные старые номера в тексте (на всякий случай)
                //caption = caption.replace(/^(Рисунок|Figure|Fig\.|Рис\.)\s*\d+\.?\s*/i, '').trim();

                figures.push({
                    id,
                    caption: caption || 'Без описания',
                    filePath: fileUri.fsPath,
                    label: caption,
                });
            }
        } catch {
            console.warn(`Не удалось прочитать файл: ${fileUri.fsPath}`);
        }
    }

    // Сортируем по имени файла + id
    figures.sort((a, b) => a.filePath.localeCompare(b.filePath) || a.id.localeCompare(b.id));

    return figures;
}
module.exports = { pasteImageFromListAsync };
