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
  sortTocItems 
} = require("../utils");

/**
 * Рекурсивная переиндексация проекта
 * @param {string} dir 
 * @param {string} parentIndex 
 * @param {'ascending'|'descending'|'none'} sortOrder 
 * @param {'nonIndexedTop'|'nonIndexedBottom'} sortKind 
 */
function reindexDirectory(dir, parentIndex = "", sortOrder = "ascending", sortKind = "nonIndexedBottom") {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  const sections = items.filter((item) => {
    if (!item.isDirectory()) return false;
    return fs.existsSync(path.join(dir, item.name, FrontMatterFiles.INDEX_MD));
  });

  const localSectionTypes = sectionTypes();
  let localCounter = 0;

  const tocPath = path.join(dir, FrontMatterFiles.TOC_YAML);
  let tocDoc = null;
  if (fs.existsSync(tocPath)) {
    try {
      tocDoc = loadTocFromFile(tocPath);
    } catch (e) {
      console.error(`Ошибка загрузки toc:`, e);
    }
  }

  for (const section of sections) {
    const sectionPath = path.join(dir, section.name);
    const indexPath = path.join(sectionPath, FrontMatterFiles.INDEX_MD);
    let content = fs.readFileSync(indexPath, "utf8");

    const metadata = getSectionMetadata(content);
    let sectionType = metadata.sectionType || "Page";
    let pureTitle = metadata.pureTitle || section.name;
    let currentIndex = String( metadata.sectionIndex || "");

    if (FrontMatterSectionTypesIndexed.includes(sectionType)) {
      if (!currentIndex) {
        localCounter++;
        currentIndex = String( (parentIndex ? `${parentIndex}.${localCounter}` : `${localCounter}`) || "");
      } else {
        const parts = currentIndex.split(".");
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) localCounter = lastNum;
      }

      const localSection = localSectionTypes.find(st => st.name === sectionType);
      const sectionLabel = localSection?.label || "";
      const newTitle = `${sectionLabel} ${currentIndex}. ${pureTitle}`;

      content = update(content, "sectionIndex", currentIndex);
      content = update(content, "pureTitle", pureTitle);
      content = update(content, "title", newTitle);

      fs.writeFileSync(indexPath, content, "utf8");

      if (tocDoc && tocDoc.items) {
        updateTocItemName(tocDoc, section.name, newTitle);
      }
    }

    reindexDirectory(sectionPath, currentIndex || parentIndex, sortOrder, sortKind);
  }

  if (tocDoc && sortOrder !== "none") {
    sortTocItems(tocDoc, dir, sortOrder, sortKind);
    saveTocToFile(tocPath, tocDoc);
  }
}

module.exports = { reindexDirectory };