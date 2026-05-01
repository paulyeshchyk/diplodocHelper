// diplodoc-helper.createSection.js
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// --- ШАБЛОНЫ (Константы) ---
const TEMPLATE_INDEX_MD = (title) => `---\ntitle: ${title}\n---\n# ${title}\n`;
const TEMPLATE_INDEX_YAML = (title) => `title: ${title}\ndescription: Описывает ${title}\nmeta:\n  title: ${title}\n  noIndex: true\n`;
const TEMPLATE_TOC_YAML = (title) => `title: ${title}\nhref: index.yaml\n`;

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function isValidName(name) {
    if (!name || name.trim().length === 0) return false;
    if (name.length > 255) return false;
    return true;
}

function canCreateFolder(folderPath) {
    if (fs.existsSync(folderPath)) {
        vscode.window.showErrorMessage(`Ошибка: Путь уже существует: ${folderPath}`);
        return false;
    }
    try {
        fs.accessSync(path.dirname(folderPath), fs.constants.W_OK);
        return true;
    } catch (err) {
        vscode.window.showErrorMessage(`Нет прав на запись в директорию: ${path.dirname(folderPath)}`);
        return false;
    }
}

function createIndexMd(folderPath, title) {
    const filePath = path.join(folderPath, 'index.md');
    fs.writeFileSync(filePath, TEMPLATE_INDEX_MD(title), 'utf8');
}

function createIndexYaml(folderPath, title) {
    const filePath = path.join(folderPath, 'index.yaml');
    fs.writeFileSync(filePath, TEMPLATE_INDEX_YAML(title), 'utf8');
}

function createTocYaml(folderPath, title) {
    const filePath = path.join(folderPath, 'toc.yaml');
    fs.writeFileSync(filePath, TEMPLATE_TOC_YAML(title), 'utf8');
}

function patchParentToc(parentDir, sectionTitle, folderName) {
    const tocPath = path.join(parentDir, 'toc.yaml');
    if (!fs.existsSync(tocPath)) {
        console.warn(`Родительский toc.yaml не найден в ${parentDir}`);
        return;
    }
    let content = fs.readFileSync(tocPath, 'utf8');
    const newItemEntry = `  - name: ${sectionTitle}\n    href: ${folderName}/index.md\n    include:\n      path: ${folderName}/toc.yaml\n      mode: link\n`;
    if (!content.includes('items:')) {
        content = content.trimEnd() + '\nitems:\n' + newItemEntry;
    } else {
        content = content.trimEnd() + '\n' + newItemEntry;
    }
    fs.writeFileSync(tocPath, content, 'utf8');
}

// --- ОСНОВНАЯ ФУНКЦИЯ (экспортируемый обработчик) ---
async function createSection(uri) {
    if (!uri) return;

    const targetDir = uri.fsPath;
    const rawName = await vscode.window.showInputBox({
        prompt: "Введите название подраздела (до 255 симв.)",
        placeHolder: "Например: Справочник Номенклатуры",
        validateInput: (value) => isValidName(value) ? null : "Некорректное имя или слишком длинное"
    });
    if (!rawName) return;

    const folderName = rawName.replace(/\s+/g, '');
    const newFolderPath = path.join(targetDir, folderName);
    if (!canCreateFolder(newFolderPath)) return;

    try {
        fs.mkdirSync(newFolderPath, { recursive: true });
        createIndexMd(newFolderPath, rawName);
        createIndexYaml(newFolderPath, rawName);
        createTocYaml(newFolderPath, rawName);
        patchParentToc(targetDir, rawName, folderName);
        vscode.window.showInformationMessage(`Раздел "${rawName}" успешно создан!`);
    } catch (err) {
        vscode.window.showErrorMessage(`Критическая ошибка: ${err.message}`);
    }
}

module.exports = { createSection };