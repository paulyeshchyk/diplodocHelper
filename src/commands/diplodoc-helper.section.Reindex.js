// src/commands/diplodoc-helper.section.Reindex.js
const fs = require("fs");
const path = require("path");
const { FrontMatterFiles, FrontMatterSectionTypesIndexed } = require("../utils");
const { sectionTypes, getSectionMetadata } = require("../utils");
const { get, update } = require("../utils");
const { 
  loadTocFromFile, 
  saveTocToFile, 
  updateTocItemName, 
  updateSectionMetadata,
  sortTocItems 
} = require("../utils");

/**
 * Рекурсивная переиндексация проекта
 * @param {string} dir
 */
function reindexDirectory(dir, parentIndex = "", sortOrder = "ascending", sortKind = "nonIndexedBottom") {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  const sections = items.filter(item => 
    item.isDirectory() && 
    fs.existsSync(path.join(dir, item.name, FrontMatterFiles.INDEX_MD))
  );

  const localSectionTypes = sectionTypes();
  let localCounter = 0;

  const tocPath = path.join(dir, FrontMatterFiles.TOC_YAML);
  let tocDoc = null;

  if (fs.existsSync(tocPath)) {
    try {
      tocDoc = loadTocFromFile(tocPath);
    } catch (e) {
      console.error(`Ошибка загрузки toc.yaml в ${dir}:`, e);
    }
  }

  for (const section of sections) {
    const result = reindexSingleSection({
      dir,
      sectionName: section.name,
      localCounter,
      parentIndex,
      localSectionTypes,
      tocDoc
    });

    localCounter = result.localCounter; // ← важно!
    
    reindexDirectory(result.sectionPath, result.currentIndex || parentIndex, sortOrder, sortKind);
  }

  // Сортируем toc текущей директории после обработки всех детей
  if (tocDoc && sortOrder !== "none") {
    sortTocItems(tocDoc, dir, sortOrder, sortKind);
    saveTocToFile(tocPath, tocDoc);
  }
}

/**
 * Обрабатывает один раздел (обновляет index.md + index.yaml)
 */
function reindexSingleSection({ dir, sectionName, localCounter, parentIndex, localSectionTypes, tocDoc }) {
  const sectionPath = path.join(dir, sectionName);
  const indexMdPath = path.join(sectionPath, FrontMatterFiles.INDEX_MD);
  
  if (!fs.existsSync(indexMdPath)) {
    return { sectionPath, currentIndex: "", localCounter };
  }

  let content = fs.readFileSync(indexMdPath, "utf8");
  const metadata = getSectionMetadata(content);

  let sectionType = metadata.sectionType || "Page";
  let pureTitle = metadata.pureTitle || sectionName;
  let currentIndex = String(metadata.sectionIndex || "");

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

    const localSection = localSectionTypes.find(st => st.name === sectionType);
    const sectionLabel = localSection?.label || "";
    const newTitle = `${sectionLabel} ${currentIndex}. ${pureTitle}`;

    // === Основное обновление ===
    updateSectionMetadata(
      sectionPath,
      pureTitle,
      sectionType,
      sectionLabel,
      currentIndex
    );

    // Обновляем имя в родительском toc.yaml
    if (tocDoc?.items) {
      updateTocItemName(tocDoc, sectionName, newTitle);
    }
  }

  return {
    sectionPath,
    currentIndex,
    localCounter
  };
}

module.exports = { reindexDirectory };