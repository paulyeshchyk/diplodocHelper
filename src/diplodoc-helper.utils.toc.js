const { FrontMatterFiles, FrontMatterSectionTypesIndexed, FrontMatterMeta } = require("./diplodoc-helper.utils.constants");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { getFrontmatterValue } = require("./diplodoc-helper.utils.frontmatter");

/**
 * @param {string} indent
 * @param {string} composedTitle
 * @param {string} newFolderName
 * @returns {string}
 */
function indentedTocEntry(indent, composedTitle, newFolderName) {
  const lines = [
    `${indent}- name: ${composedTitle}`,
    `${indent}  href: ${newFolderName}/${FrontMatterFiles.INDEX_MD}`,
    `${indent}  include:`,
    `${indent}    path: ${newFolderName}/${FrontMatterFiles.TOC_YAML}`,
    `${indent}    mode: link`,
  ];
  return lines.join("\n");
}

/**
 * Нормализует множественные пустые строки.
 * @param {string} str
 * @returns {string}
 */
function normalizeEmptyLines(str) {
  return str.replace(/\n\s*\n\s*\n/g, "\n\n");
}

/**
 * Удаляет запись о разделе из родительского toc.yaml по имени папки.
 * @param {string} parentDir
 * @param {string} folderName
 */
function removeTocEntryByFolder(parentDir, folderName) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;
  let content = fs.readFileSync(tocPath, "utf8");
  const sectionRegex = new RegExp(
    `\\s*-\\s+name:.*\\r?\\n\\s+href:\\s+${folderName}/index\\.md(?:\\r?\\n\\s+include:\\r?\\n\\s+path:\\s+${folderName}/toc\\.yaml\\r?\\n\\s+mode:\\s+link)?`,
    "g",
  );
  let newContent = content.replace(sectionRegex, "");
  newContent = normalizeEmptyLines(newContent);
  newContent = newContent.trimEnd() + "\n";
  fs.writeFileSync(tocPath, newContent, "utf8");
}

/**
 * Определяет отступ, используемый в родительском toc.yaml (обычно два пробела).
 * @param {string} parentDir
 * @returns {string}
 */
function getTocIndentation(parentDir) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return "  ";
  const content = fs.readFileSync(tocPath, "utf8");
  const match = content.match(/^(\s*)-\s+name:/m);
  return match ? match[1] : "  ";
}

/**
 * Добавляет запись о разделе в родительский toc.yaml.
 * @param {string} parentDir
 * @param {string} composedTitle
 * @param {string} newFolderName
 */
function addTocEntry(parentDir, composedTitle, newFolderName) {
  const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
  if (!fs.existsSync(tocPath)) return;
  let content = fs.readFileSync(tocPath, "utf8");
  const indent = getTocIndentation(parentDir);
  const newEntry = indentedTocEntry(indent, composedTitle, newFolderName);
  if (!content.includes("items:")) {
    content = content.trimEnd() + "\nitems:\n" + newEntry;
  } else {
    content = content.trimEnd() + "\n" + newEntry;
  }
  content = normalizeEmptyLines(content);
  fs.writeFileSync(tocPath, content, "utf8");
}

/**
 * Обновляет ссылки на раздел в родительском index.yaml (href и title).
 * @param {string} parentDir
 * @param {string} oldFolderName
 * @param {string} newFolderName
 * @param {string} composedTitle
 */
function updateParentIndexYaml(
  parentDir,
  oldFolderName,
  newFolderName,
  composedTitle,
) {
  const indexPath = path.join(parentDir, FrontMatterFiles.INDEX_YAML);
  if (!fs.existsSync(indexPath)) return;
  let content = fs.readFileSync(indexPath, "utf8");
  let changed = false;

  const hrefRegex = new RegExp(`(href:\\s*)${oldFolderName}/`, "g");
  const newContentHref = content.replace(hrefRegex, `$1${newFolderName}/`);
  if (newContentHref !== content) {
    content = newContentHref;
    changed = true;
  }

  const oldSelfHref = `${oldFolderName}/index.md`;
  const newSelfHref = `${newFolderName}/index.md`;
  const selfEntryRegex = new RegExp(
    `(\\s*-\\s+title:\\s*)([^\\n]+)(\\n\\s+href:\\s+)${oldSelfHref}`,
    "g",
  );
  const newContentSelf = content.replace(
    selfEntryRegex,
    `$1${composedTitle}$3${newSelfHref}`,
  );
  if (newContentSelf !== content) {
    content = newContentSelf;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(indexPath, content, "utf8");
  }
}

/**
 * Загружает toc.yaml из файла и возвращает объект.
 * @param {string} tocPath
 * @returns {import('./diplodoc-helper.utils.types').TocDocument}
 */
function loadTocFromFile(tocPath) {
  const content = fs.readFileSync(tocPath, "utf8");
  return /** @type {import('./diplodoc-helper.utils.types').TocDocument} */ (yaml.load(content));
}

/**
 * Сохраняет объект оглавления в файл toc.yaml.
 * @param {string} tocPath
 * @param {import('./diplodoc-helper.utils.types').TocDocument} tocDoc
 */
function saveTocToFile(tocPath, tocDoc) {
  fs.writeFileSync(tocPath, yaml.dump(tocDoc, { lineWidth: -1, noArrayIndent: true }));
}

/**
 * Обновляет имя элемента в оглавлении по имени папки (href).
 * @param {import('./diplodoc-helper.utils.types').TocDocument} tocDoc
 * @param {string} folderName
 * @param {string} newName
 */
function updateTocItemName(tocDoc, folderName, newName) {
  if (!tocDoc.items) return;
  for (const item of tocDoc.items) {
    if (item.href && (item.href === folderName || item.href.startsWith(folderName + "/"))) {
      item.name = newName;
    }
  }
}

/**
 * Сравнивает два строковых индекса (например, "1.2.3").
 * @param {string | null} a
 * @param {string | null} b
 * @param {'ascending' | 'descending'} order
 * @returns {number}
 */
function compareIndexes(a, b, order) {
  if (!a || !b) return 0;
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);
  const maxLen = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLen; i++) {
    const ai = i < aParts.length ? aParts[i] : 0;
    const bi = i < bParts.length ? bParts[i] : 0;
    if (ai !== bi) {
      return order === "ascending" ? ai - bi : bi - ai;
    }
  }
  return 0;
}

/**
 * Получает sectionIndex для раздела, на который указывает элемент оглавления.
 * @param {import('./diplodoc-helper.utils.types').TocItem} item
 * @param {string} baseDir
 * @returns {string | null}
 */
function getItemIndex(item, baseDir) {
  if (!item.href) return null;
  const targetPath = path.join(baseDir, item.href);
  const indexPath = path.join(targetPath, FrontMatterFiles.INDEX_MD);
  if (!fs.existsSync(indexPath)) return null;
  const content = fs.readFileSync(indexPath, "utf8");
  const sectionType = getFrontmatterValue(content, FrontMatterMeta.SECTIONTYPE);
  if (!sectionType || !FrontMatterSectionTypesIndexed.includes(sectionType)) return null;
  const idx = getFrontmatterValue(content, FrontMatterMeta.SECTIONINDEX);
  return idx || null;
}

/**
 * Сортирует элементы оглавления на основе их sectionIndex.
 * @param {import('./diplodoc-helper.utils.types').TocDocument} tocDoc
 * @param {string} baseDir
 * @param {'ascending' | 'descending' | 'none'} sortOrder
 * @param {'nonIndexedTop' | 'nonIndexedBottom'} sortKind
 */
function sortTocItems(tocDoc, baseDir, sortOrder, sortKind) {
  if (!tocDoc.items || tocDoc.items.length === 0 || sortOrder === "none") return;

  const itemsWithIndex = tocDoc.items.map((item) => ({
    item,
    index: getItemIndex(item, baseDir),
  }));

  const indexed = itemsWithIndex.filter((i) => i.index !== null);
  const nonIndexed = itemsWithIndex.filter((i) => i.index === null);

  indexed.sort((a, b) => compareIndexes(a.index, b.index, sortOrder));

  tocDoc.items =
    sortKind === "nonIndexedTop"
      ? [...nonIndexed.map((i) => i.item), ...indexed.map((i) => i.item)]
      : [...indexed.map((i) => i.item), ...nonIndexed.map((i) => i.item)];
}

module.exports = {
  indentedTocEntry,
  removeTocEntryByFolder,
  getTocIndentation,
  addTocEntry,
  updateParentIndexYaml,
  loadTocFromFile,
  saveTocToFile,
  updateTocItemName,
  compareIndexes,
  getItemIndex,
  sortTocItems,
};
