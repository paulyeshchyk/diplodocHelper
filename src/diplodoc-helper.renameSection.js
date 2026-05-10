// diplodoc-helper.renameSection.js – финальная версия

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const {
  FrontMatterMeta,
  FrontMatterFiles,
} = require('./diplodoc-helper.constants');
const { isDiplodocSection } = require('./diplodoc-helper.utils');
const { sectionTypes } = require('./diplodoc-helper.section.utils');

// ----------------------------------------------------------------------
// Диалоги с пользователем
// ----------------------------------------------------------------------
async function promptSectionType() {
  const types = sectionTypes();
  const selected = await vscode.window.showQuickPick(types, {
    placeHolder: 'Выберите новый тип рубрики',
    canPickMany: false,
  });
  return selected;
}

async function promptSectionName() {
  return await vscode.window.showInputBox({
    prompt: 'Введите новое название раздела',
    placeHolder: 'Например: Справочник Номенклатуры',
    validateInput: (value) =>
      value && value.trim().length > 0 && value.length <= 255
        ? null
        : 'Некорректное имя или слишком длинное',
  });
}

// ----------------------------------------------------------------------
// Генерация имени папки
// ----------------------------------------------------------------------
/**
 * @param {{ label: any; name?: string; description?: string; }} sectionType
 * @param {string} sectionName
 */
function generateFolderName(sectionType, sectionName) {
  const sanitized = sectionName.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '');
  return `${sectionType.label}.${sanitized}`;
}

// ----------------------------------------------------------------------
// Работа с YAML frontmatter (чтение / запись через js-yaml)
// ----------------------------------------------------------------------

/**
 * Читает файл, отделяет frontmatter (между ---) от основного содержимого,
 * парсит frontmatter в объект.
 * @param {string} filePath
 * @returns {{frontmatter: object;body: string;raw: string;}?} или null при ошибке
 */
function readFileWithFrontmatter(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  if (!match) return null;
  try {
    const frontmatter = yaml.load(match[1]);
    return { frontmatter: frontmatter || {}, body: match[2], raw: content };
  } catch (err) {
    console.warn(`Ошибка парсинга YAML в ${filePath}:`, err);
    return null;
  }
}

/**
 * Записывает файл с обновлённым frontmatter.
 * @param {string} filePath
 * @param {object} newFrontmatter
 * @param {string} body - содержимое после frontmatter (необязательно, если не изменилось)
 */
function writeFileWithFrontmatter(filePath, newFrontmatter, body) {
  const existing = readFileWithFrontmatter(filePath);
  const finalBody = body !== undefined ? body : (existing ? existing.body : '');
  const yamlStr = yaml.dump(newFrontmatter, { lineWidth: 120, noRefs: true });
  const newContent = `---\n${yamlStr}---\n${finalBody}`;
  fs.writeFileSync(filePath, newContent, 'utf8');
}

// ----------------------------------------------------------------------
// Обновление index.md и index.yaml переименованного раздела
// ----------------------------------------------------------------------

/**
 * Обновляет index.md: pureTitle, sectionType, title, sectionIndex
 * @param {string} folderPath
 * @param {string} pureTitle
 * @param {string} sectionTypeName
 * @param {string} sectionLabel
 * @param {string} sectionIndex
 */
function updateIndexMdAdvanced(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex) {
  const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
  if (!fs.existsSync(indexPath)) return;

  const data = readFileWithFrontmatter(indexPath);
  if (!data) {
    console.warn(`Не удалось прочитать frontmatter в ${indexPath}`);
    return;
  }

  const fm = data.frontmatter;
  // Сохраняем старый sectionIndex, если он был, иначе используем переданный
  const finalIndex = fm[FrontMatterMeta.SECTIONINDEX] || sectionIndex;
  const composedTitle = `${sectionLabel} ${finalIndex}. ${pureTitle}`;

  // Обновляем поля
  fm[FrontMatterMeta.TITLE] = composedTitle;
  fm[FrontMatterMeta.PURETITLE] = pureTitle;
  fm[FrontMatterMeta.SECTIONTYPE] = sectionTypeName;
  fm[FrontMatterMeta.SECTIONINDEX] = finalIndex;

  writeFileWithFrontmatter(indexPath, fm, data.body);
}

/**
 * Обновляет index.yaml: pureTitle, sectionType, title, sectionIndex
 * @param {string} folderPath
 * @param {string} pureTitle
 * @param {string} sectionTypeName
 * @param {string} sectionLabel
 * @param {string} sectionIndex
 */
function updateIndexYamlAdvanced(folderPath, pureTitle, sectionTypeName, sectionLabel, sectionIndex) {
  const yamlPath = path.join(folderPath, FrontMatterFiles.INDEX_YAML);
  if (!fs.existsSync(yamlPath)) return;

  const data = readFileWithFrontmatter(yamlPath);
  if (!data) {
    console.warn(`Не удалось прочитать frontmatter в ${yamlPath}`);
    return;
  }

  const fm = data.frontmatter;
  const finalIndex = fm[FrontMatterMeta.SECTIONINDEX] || sectionIndex;
  const composedTitle = `${sectionLabel} ${finalIndex}. ${pureTitle}`;

  fm[FrontMatterMeta.TITLE] = composedTitle;
  fm[FrontMatterMeta.PURETITLE] = pureTitle;
  fm[FrontMatterMeta.SECTIONTYPE] = sectionTypeName;
  fm[FrontMatterMeta.SECTIONINDEX] = finalIndex;

  writeFileWithFrontmatter(yamlPath, fm, data.body);
}

// ----------------------------------------------------------------------
// Обновление собственного toc.yaml (только первого name)
// ----------------------------------------------------------------------
/**
 * @param {string} folderPath
 * @param {string} newComposedTitle
 */
function updateTocYaml(folderPath, newComposedTitle) {
  const tocPath = path.join(folderPath, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;

  let content = fs.readFileSync(tocPath, 'utf8');
  const firstItemRegex = /(items:\s*\n\s*-\s+name:\s*)([^\n]+)/;
  const match = content.match(firstItemRegex);
  if (match) {
    const originalIndent = match[1];
    const newLine = `${originalIndent}${newComposedTitle}`;
    content = content.replace(firstItemRegex, newLine);
    fs.writeFileSync(tocPath, content, 'utf8');
  }
}

// ----------------------------------------------------------------------
// Работа с родительским toc.yaml
// ----------------------------------------------------------------------
/**
 * @param {string} str
 */
function normalizeEmptyLines(str) {
  return str.replace(/\n\s*\n\s*\n/g, '\n\n');
}

/**
 * @param {string} parentDir
 * @param {string} folderName
 */
function removeFromParentToc(parentDir, folderName) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;

  let content = fs.readFileSync(tocPath, 'utf8');
  const sectionRegex = new RegExp(
    `\\s*-\\s+name:.*\\r?\\n\\s+href:\\s+${folderName}/index\\.md(?:\\r?\\n\\s+include:\\r?\\n\\s+path:\\s+${folderName}/toc\\.yaml\\r?\\n\\s+mode:\\s+link)?`,
    'g'
  );
  let newContent = content.replace(sectionRegex, '');
  newContent = normalizeEmptyLines(newContent);
  newContent = newContent.trimEnd() + '\n';
  fs.writeFileSync(tocPath, newContent, 'utf8');
}

/**
 * @param {string} parentDir
 */
function getIndentationFromParentToc(parentDir) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return '  ';
  const content = fs.readFileSync(tocPath, 'utf8');
  const match = content.match(/^(\s*)-\s+name:/m);
  return match ? match[1] : '  ';
}

/**
 * @param {string} parentDir
 * @param {string} composedTitle
 * @param {string} newFolderName
 */
function addToParentToc(parentDir, composedTitle, newFolderName) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;

  let content = fs.readFileSync(tocPath, 'utf8');
  const indent = getIndentationFromParentToc(parentDir);
  const newEntry = `${indent}- name: ${composedTitle}
${indent}  href: ${newFolderName}/index.md
${indent}  include:
${indent}    path: ${newFolderName}/toc.yaml
${indent}    mode: link`;

  if (!content.includes('items:')) {
    content = content.trimEnd() + '\nitems:\n' + newEntry;
  } else {
    content = content.trimEnd() + '\n' + newEntry;
  }
  content = normalizeEmptyLines(content);
  fs.writeFileSync(tocPath, content, 'utf8');
}

// ----------------------------------------------------------------------
// Обновление родительского index.yaml
// ----------------------------------------------------------------------
/**
 * @param {string} parentDir
 * @param {string} oldFolderName
 * @param {string} newFolderName
 * @param {string} composedTitle
 */
function updateParentIndexYaml(parentDir, oldFolderName, newFolderName, composedTitle) {
  const indexPath = path.join(parentDir, FrontMatterFiles.INDEX_YAML);
  if (!fs.existsSync(indexPath)) return;

  let content = fs.readFileSync(indexPath, 'utf8');
  let changed = false;

  // Заменяем все href вида "oldFolderName/..." на "newFolderName/..."
  const hrefRegex = new RegExp(`(href:\\s*)${oldFolderName}/`, 'g');
  const newContentHref = content.replace(hrefRegex, `$1${newFolderName}/`);
  if (newContentHref !== content) {
    content = newContentHref;
    changed = true;
  }

  // Обновляем title и href для записи, указывающей на сам раздел
  const oldSelfHref = `${oldFolderName}/index.md`;
  const newSelfHref = `${newFolderName}/index.md`;
  const selfEntryRegex = new RegExp(
    `(\\s*-\\s+title:\\s*)([^\\n]+)(\\n\\s+href:\\s+)${oldSelfHref}`,
    'g'
  );
  const newContentSelf = content.replace(selfEntryRegex, `$1${composedTitle}$3${newSelfHref}`);
  if (newContentSelf !== content) {
    content = newContentSelf;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(indexPath, content, 'utf8');
  }
}

// ----------------------------------------------------------------------
// Чтение текущего sectionIndex из index.md
// ----------------------------------------------------------------------
/**
 * @param {string} folderPath
 */
function readSectionIndex(folderPath) {
  const indexPath = path.join(folderPath, FrontMatterFiles.INDEX_MD);
  if (!fs.existsSync(indexPath)) return '1';
  const data = readFileWithFrontmatter(indexPath);
  if (data && data.frontmatter[FrontMatterMeta.SECTIONINDEX]) {
    return String(data.frontmatter[FrontMatterMeta.SECTIONINDEX]);
  }
  return '1';
}

// ----------------------------------------------------------------------
// ОСНОВНАЯ ФУНКЦИЯ
// ----------------------------------------------------------------------
/**
 * @param {{ fsPath: any; }} uri
 */
async function renameSection(uri) {
  if (!uri) return;

  const oldFolderPath = uri.fsPath;
  const oldFolderName = path.basename(oldFolderPath);
  const parentDir = path.dirname(oldFolderPath);

  if (!isDiplodocSection(oldFolderPath)) {
    vscode.window.showErrorMessage(
      'Переименовать можно только полноценный раздел (содержит index.md, index.yaml, toc.yaml).'
    );
    return;
  }

  const newSectionType = await promptSectionType();
  if (!newSectionType) return;

  const newPureTitle = await promptSectionName();
  if (!newPureTitle) return;

  const newFolderName = generateFolderName(newSectionType, newPureTitle);
  const newFolderPath = path.join(parentDir, newFolderName);

  if (fs.existsSync(newFolderPath)) {
    vscode.window.showErrorMessage(`Папка ${newFolderName} уже существует.`);
    return;
  }
  try {
    fs.accessSync(parentDir, fs.constants.W_OK);
  } catch {
    vscode.window.showErrorMessage(`Нет прав на запись в родительскую директорию ${parentDir}`);
    return;
  }

  const sectionIndex = readSectionIndex(oldFolderPath);
  const composedTitle = `${newSectionType.label} ${sectionIndex}. ${newPureTitle}`;

  // 1. Удаляем старую запись из родительского toc.yaml
  removeFromParentToc(parentDir, oldFolderName);

  // 2. Обновляем родительский index.yaml (href и title для самого раздела)
  updateParentIndexYaml(parentDir, oldFolderName, newFolderName, composedTitle);

  // 3. Переименовываем папку
  try {
    fs.renameSync(oldFolderPath, newFolderPath);
  } catch (err) {
    // Откат: возвращаем запись в toc.yaml
    addToParentToc(parentDir, composedTitle, oldFolderName);
    vscode.window.showErrorMessage(`Не удалось переименовать папку: ${err.message}`);
    return;
  }

  // 4. Обновляем внутренние файлы раздела
  try {
    updateIndexMdAdvanced(newFolderPath, newPureTitle, newSectionType.name, newSectionType.label, sectionIndex);
    updateIndexYamlAdvanced(newFolderPath, newPureTitle, newSectionType.name, newSectionType.label, sectionIndex);
    updateTocYaml(newFolderPath, composedTitle);
  } catch (err) {
    vscode.window.showWarningMessage(
      `Раздел переименован, но не удалось обновить содержимое файлов: ${err.message}`
    );
  }

  // 5. Добавляем новую запись в родительский toc.yaml (с составным title)
  addToParentToc(parentDir, composedTitle, newFolderName);

  vscode.window.showInformationMessage(
    `Раздел "${oldFolderName}" переименован в "${newFolderName}" (тип: ${newSectionType.label}, индекс: ${sectionIndex})`
  );
}

module.exports = { renameSection };