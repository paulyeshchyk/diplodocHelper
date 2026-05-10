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


function reindexDirectory(dir, parentIndex = "", sortOrder = "ascending", sortKind = "nonIndexedBottom") {
  console.log(`🔄 Переиндексация: ${path.relative(process.cwd(), dir) || '.'}`);

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
      console.error(`❌ Ошибка загрузки toc.yaml: ${dir}`);
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
  console.log(`   📊 Сортируем toc.yaml (${sections.length} элементов)`);
  sortTocItems(dir, sortOrder, sortKind);        // ← передаём dir, а не tocDoc
  console.log(`   ✅ toc.yaml отсортирован`);
}
}

/**
 * Обрабатывает один раздел (index.md + index.yaml)
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
  let currentIndex = String(metadata.sectionIndex || "").trim();

  if (FrontMatterSectionTypesIndexed.includes(sectionType)) {
    const hadManualIndex = !!currentIndex;

    if (!currentIndex) {
      // Только если индекса нет — генерируем новый
      localCounter++;
      currentIndex = parentIndex 
        ? `${parentIndex}.${localCounter}` 
        : `${localCounter}`;
    } else {
      // Если индекс есть — уважаем его и обновляем localCounter
      const parts = currentIndex.split(".");
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        localCounter = Math.max(localCounter, lastNum);
      }
    }

    const localSection = localSectionTypes.find(st => st.name === sectionType);
    const sectionLabel = localSection?.label || "";
    const newTitle = `${sectionLabel} ${currentIndex}. ${pureTitle}`;

    // Обновляем файлы
    updateSectionMetadata(sectionPath, pureTitle, sectionType, sectionLabel, currentIndex);

    if (tocDoc?.items) {
      updateTocItemName(tocDoc, sectionName, newTitle);
    }

    if (hadManualIndex) {
      console.log(`   📍 Сохранён ручной индекс: ${currentIndex} → ${sectionName}`);
    } else {
      console.log(`   ➕ Присвоен индекс: ${currentIndex} → ${sectionName}`);
    }
  }

  return { sectionPath, currentIndex, localCounter };
}

module.exports = { reindexDirectory };