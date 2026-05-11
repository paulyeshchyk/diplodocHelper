// src/commands/diplodoc-helper.section.Reindex.js
const fs = require("fs");
const path = require("path");
const { FrontMatterFiles, FrontMatterSectionTypesIndexed } = require("../utils");
const { sectionTypes, getSectionMetadata } = require("../utils");
const {
  renameSectionFolderIfNeeded,
  loadTocFromFile,
  updateTocItemName,
  updateSectionMetadata,
  sortTocItems
} = require("../utils");


/**
 * @param {string} dir
 */
function reindexDirectory(dir, parentIndex = "", sortOrder = "ascending", sortKind = "nonIndexedBottom") {
  console.log(`Переиндексация: ${path.relative(process.cwd(), dir) || '.'}`);

  const items = fs.readdirSync(dir, { withFileTypes: true });

  const sections = items.filter(item =>
    item.isDirectory() && fs.existsSync(path.join(dir, item.name, FrontMatterFiles.INDEX_MD))
  );

  if (sections.length === 0) return;

  const localSectionTypes = sectionTypes();
  let localCounter = 0;

  const tocPath = path.join(dir, FrontMatterFiles.TOC_YAML);
  let tocDoc = null;

  if (fs.existsSync(tocPath)) {
    try {
      tocDoc = loadTocFromFile(tocPath);
    } catch (e) {
      console.error(`Ошибка загрузки toc.yaml: ${dir}`);
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

    localCounter = result.localCounter;
    reindexDirectory(result.sectionPath, result.currentIndex || parentIndex, sortOrder, sortKind);
  }

  // Сортировка после обработки детей
  if (tocDoc && sortOrder !== "none") {
    console.log(`   Сортируем toc.yaml (${sections.length} элементов)`);
    sortTocItems(dir, sortOrder, sortKind);        // передаём dir, а не tocDoc
    console.log(`   toc.yaml отсортирован`);
  }
}

/**
 * Обрабатывает один раздел + переименовывает папку при необходимости
 */
function reindexSingleSection({ dir, sectionName, localCounter, parentIndex, localSectionTypes, tocDoc }) {
  const sectionPath = path.join(dir, sectionName);
  const indexMdPath = path.join(sectionPath, FrontMatterFiles.INDEX_MD);

  if (!fs.existsSync(indexMdPath)) {
    return { sectionPath, currentIndex: "", localCounter, newFolderName: sectionName };
  }

  let content = fs.readFileSync(indexMdPath, "utf8");
  const metadata = getSectionMetadata(content);

  let sectionType = metadata.sectionType || "Page";
  let pureTitle = metadata.pureTitle || sectionName;
  let currentIndex = String(metadata.sectionIndex || "").trim();

  let newFolderName = sectionName;

  if (FrontMatterSectionTypesIndexed.includes(sectionType)) {
    const hadManualIndex = !!currentIndex;

    if (!currentIndex) {
      localCounter++;
      currentIndex = parentIndex ? `${parentIndex}.${localCounter}` : `${localCounter}`;
    } else {
      const parts = currentIndex.split(".");
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) localCounter = Math.max(localCounter, lastNum);
    }

    const localSection = localSectionTypes.find(st => st.name === sectionType);
    const sectionLabel = localSection?.label || "";
    const newTitle = `${sectionLabel} ${currentIndex}. ${pureTitle}`;

    // === Основное обновление метаданных ===
    updateSectionMetadata(sectionPath, pureTitle, sectionType, sectionLabel, currentIndex);

    // === Переименовываем папку ===
    newFolderName = renameSectionFolderIfNeeded(
      sectionPath,
      pureTitle,
      { name: sectionType, label: sectionLabel },
      currentIndex
    );

    if (tocDoc?.items) {
      updateTocItemName(tocDoc, sectionName, newTitle); // обновляем старое имя
    }

    if (hadManualIndex) {
      console.log(`   Сохранён ручной индекс: ${currentIndex} -> ${pureTitle}`);
    } else {
      console.log(`   Присвоен индекс: ${currentIndex} -> ${pureTitle}`);
    }
  }

  return {
    sectionPath: path.join(dir, newFolderName),
    currentIndex,
    localCounter,
    newFolderName
  };
}

module.exports = { reindexDirectory };