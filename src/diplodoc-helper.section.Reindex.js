// diplodoc-helper.section.Reindex.js
const fs = require("fs");
const path = require("path");
const { FrontMatterFiles, FrontMatterSectionTypesIndexed } = require("./diplodoc-helper.utils.constants");
const { sectionTypes, getSectionMetadata } = require("./diplodoc-helper.utils.section");
const { getFrontmatterValue, updateFrontmatterValue } = require("./diplodoc-helper.utils.frontmatter");
const { loadTocFromFile, saveTocToFile, updateTocItemName, sortTocItems } = require("./diplodoc-helper.utils.toc");

/**
 * Рекурсивная переиндексация проекта с сортировкой элементов оглавления.
 * @param {string} dir - Текущая директория
 * @param {string} parentIndex - Индекс родителя
 * @param {'ascending'|'descending'|'none'} sortOrder - Порядок сортировки (по индексу)
 * @param {'nonIndexedTop'|'nonIndexedBottom'} sortKind - Положение элементов без индекса
 */
function reindexDirectory(dir, parentIndex = "", sortOrder = "ascending", sortKind = "nonIndexedBottom") {
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
      tocDoc = loadTocFromFile(tocPath);
    } catch (e) {
      console.error(`Ошибка загрузки ${tocPath}:`, e);
    }
  }

  // Обрабатываем каждую секцию (подпапку)
  for (const section of sections) {
    const sectionPath = path.join(dir, section.name);
    const indexPath = path.join(sectionPath, FrontMatterFiles.INDEX_MD);
    let content = fs.readFileSync(indexPath, "utf8");

    const metadata = getSectionMetadata(content);
    let sectionType = metadata.sectionType || "Page";
    let pureTitle = metadata.pureTitle || section.name;
    let currentIndex = metadata.sectionIndex;

    // Логика индексации (только для Part/Section/Chapter)
    if (FrontMatterSectionTypesIndexed.includes(sectionType)) {
      if (!currentIndex) {
        localCounter++;
        currentIndex = parentIndex ? `${parentIndex}.${localCounter}` : `${localCounter}`;
      } else {
        const parts = currentIndex.split(".");
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) localCounter = lastNum;
      }

      const localSection = localSectionTypes.find((st) => st.name === sectionType);
      const sectionLabel = localSection?.label || "";
      const newTitle = `${sectionLabel} ${currentIndex}. ${pureTitle}`;

      // Обновляем метаданные в содержимом
      content = updateFrontmatterValue(content, "sectionIndex", currentIndex);
      content = updateFrontmatterValue(content, "pureTitle", pureTitle);
      content = updateFrontmatterValue(content, "title", newTitle);
      fs.writeFileSync(indexPath, content, "utf8");

      // Обновляем имя элемента в оглавлении родителя
      if (tocDoc && tocDoc.items) {
        updateTocItemName(tocDoc, section.name, newTitle);
      }
    }

    // Рекурсивный обход вложенных папок
    reindexDirectory(sectionPath, currentIndex || parentIndex, sortOrder, sortKind);
  }

  // После обработки всех секций – сортируем оглавление текущей папки (если требуется)
  if (tocDoc && sortOrder !== "none") {
    sortTocItems(tocDoc, dir, sortOrder, sortKind);
    saveTocToFile(tocPath, tocDoc);
  }
}

module.exports = { reindexDirectory };