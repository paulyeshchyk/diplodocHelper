// diplodoc-helper.reindex.js
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const { sectionTypes } = require("./diplodoc-helper.utils.section");
const {
  FrontMatterMeta,
  FrontMatterFiles,
  FrontMatterSectionTypes,
  FrontMatterSectionTypesIndexed,
} = require("./diplodoc-helper.utils.constants");

/** @import { TocItem, TocDocument } from './diplodoc-helper.utils.types.js' */


/**
 * Рекурсивная переиндексация проекта с сортировкой элементов оглавления
 * @param {string} dir Текущая директория
 * @param {string} parentIndex Индекс родителя
 * @param {'ascending'|'descending'|'none'} sortOrder Порядок сортировки (по индексу)
 * @param {'nonIndexedTop'|'nonIndexedBottom'} sortKind Положение элементов без индекса
 */
function reindexDirectory(
  dir,
  parentIndex = "",
  sortOrder = "ascending",
  sortKind = "nonIndexedBottom",
) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  // Только папки, содержащие index.md
  const sections = items.filter((item) => {
    if (!item.isDirectory()) return false;
    const indexPath = path.join(dir, item.name, FrontMatterFiles.INDEX_MD);
    return fs.existsSync(indexPath);
  });

  const localSectionTypes = sectionTypes();
  let localCounter = 0;

  // Загружаем оглавление родительской папки (если существует)
  const tocPath = path.join(dir, FrontMatterFiles.TOC_YAML);
  let tocDoc = null;
  if (fs.existsSync(tocPath)) {
    try {
      tocDoc = LoadToc(tocPath);
    } catch (e) {
      console.error(`Ошибка загрузки ${tocPath}:`, e);
    }
  }

  // Обрабатываем каждую секцию (подпапку)
  for (const section of sections) {
    const sectionPath = path.join(dir, section.name);
    const indexPath = path.join(sectionPath, FrontMatterFiles.INDEX_MD);

    let content = fs.readFileSync(indexPath, "utf8");

    const sectionType =
      getMetadataValue(content, FrontMatterMeta.SECTIONTYPE) ||
      FrontMatterSectionTypes.PAGE;
    const pureTitle =
      getMetadataValue(content, FrontMatterMeta.PURETITLE) ||
      getMetadataValue(content, FrontMatterMeta.TITLE) ||
      section.name;
    let currentIndex = getMetadataValue(content, FrontMatterMeta.SECTIONINDEX);

    // Логика индексации (только для Part/Section/Chapter)
    if (FrontMatterSectionTypesIndexed.includes(sectionType)) {
      if (!currentIndex) {
        localCounter++;
        currentIndex = parentIndex
          ? `${parentIndex}.${localCounter}`
          : `${localCounter}`;
      } else {
        const parts = currentIndex.split(".");
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) localCounter = lastNum;
      }

      const localSection = localSectionTypes.find(
        (st) => st.name === sectionType,
      );
      const sectionLabel = localSection?.label || "";
      const newTitle = `${sectionLabel} ${currentIndex}. ${pureTitle}`;

      // Обновляем index.md
      content = updateMetadata(
        content,
        FrontMatterMeta.SECTIONINDEX,
        currentIndex,
      );
      content = updateMetadata(content, FrontMatterMeta.PURETITLE, pureTitle);
      content = updateMetadata(content, FrontMatterMeta.TITLE, newTitle);
      fs.writeFileSync(indexPath, content, "utf8");

      // Обновляем имя элемента в оглавлении родителя
      if (tocDoc && tocDoc.items) {
        updateTocItemName(tocDoc, section.name, newTitle);
      }
    }

    // Рекурсивный обход вложенных папок (с теми же параметрами сортировки)
    reindexDirectory(
      sectionPath,
      currentIndex || parentIndex,
      sortOrder,
      sortKind,
    );
  }

  // После обработки всех секций – сортируем оглавление текущей папки
  if (tocDoc && tocDoc.items && sortOrder !== "none") {
    sortTocItems(tocDoc, dir, sortOrder, sortKind);
    fs.writeFileSync(
      tocPath,
      yaml.dump(tocDoc, { lineWidth: -1, noArrayIndent: true }),
    );
  }
}

// ------------------- Вспомогательные функции -------------------

/**
 * Получить значение метаданных из содержимого index.md
 * @param {string} content
 * @param {string} key
 * @returns {string?}
 */
function getMetadataValue(content, key) {
  const match = content.match(new RegExp(`${key}:\\s*(.*)`));
  return match ? match[1].trim().replace(/['"]/g, "") : null;
}

/**
 * Обновить метаданные в содержимом index.md
 * @param {string} content
 * @param {string} key
 * @param {string} value
 */
function updateMetadata(content, key, value) {
  const regex = new RegExp(`${key}:.*`);
  if (regex.test(content)) {
    return content.replace(regex, `${key}: ${value}`);
  } else {
    return content.replace(/---\n/, `---\n${key}: ${value}\n`);
  }
}

/**
 * Загрузить toc.yaml
 * @param {fs.PathOrFileDescriptor} tocPath
 * @returns {TocDocument}
 */
function LoadToc(tocPath) {
  const content = fs.readFileSync(tocPath, "utf8");
  return /** @type {TocDocument} */ (yaml.load(content));
}

/**
 * Обновить имя элемента в уже загруженном документе оглавления
 * @param {TocDocument} tocDoc
 * @param {string} folderName
 * @param {string} newName
 */
function updateTocItemName(tocDoc, folderName, newName) {
  if (!tocDoc.items) return;
  for (const item of tocDoc.items) {
    if (
      item.href &&
      (item.href === folderName || item.href.startsWith(folderName + "/"))
    ) {
      item.name = newName;
    }
  }
}

/**
 * Сравнение двух индексов (строк вида "1", "1.2.3")
 * @param {string?} a
 * @param {string?} b
 * @param {string} order
 */
function compareIndexes(a, b, order) {
  // a, b – не null (вызывается только для существующих индексов)
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
 * Получить sectionIndex для элемента оглавления по его href
 * @param {TocItem} item
 * @param {string} baseDir
 * @returns {string?}
 */
function getItemIndex(item, baseDir) {
  if (!item.href) return null; // нет ссылки – не индексируемый элемент
  const targetPath = path.join(baseDir, item.href);
  const indexPath = path.join(targetPath, FrontMatterFiles.INDEX_MD);
  if (!fs.existsSync(indexPath)) return null;
  const content = fs.readFileSync(indexPath, "utf8");
  const sectionType = getMetadataValue(content, FrontMatterMeta.SECTIONTYPE);
  if (!sectionType) return null;
  if (!FrontMatterSectionTypesIndexed.includes(sectionType)) return null;
  const idx = getMetadataValue(content, FrontMatterMeta.SECTIONINDEX);
  return idx || null;
}

/**
 * Сортировка элементов оглавления на основе sectionIndex их целевых папок
 * @param {TocDocument} tocDoc
 * @param {string} baseDir
 * @param {string} sortOrder
 * @param {string} sortKind
 */
function sortTocItems(tocDoc, baseDir, sortOrder, sortKind) {
  if (!tocDoc.items || tocDoc.items.length === 0) return;

  // Для каждого элемента определяем его индекс (или null)
  const itemsWithIndex = tocDoc.items.map((item) => ({
    item,
    index: getItemIndex(item, baseDir),
  }));

  // Разделяем на индексированные и неиндексированные
  const indexed = itemsWithIndex.filter((i) => i.index !== null);
  const nonIndexed = itemsWithIndex.filter((i) => i.index === null);

  // Сортируем индексированные по индексу
  indexed.sort((a, b) => compareIndexes(a.index, b.index, sortOrder));

  // Собираем итоговый массив в зависимости от положения элементов без индекса
  const sortedItems =
    sortKind === "nonIndexedTop"
      ? [...nonIndexed.map((i) => i.item), ...indexed.map((i) => i.item)]
      : [...indexed.map((i) => i.item), ...nonIndexed.map((i) => i.item)];

  tocDoc.items = sortedItems;
}

module.exports = { reindexDirectory };
