// src/commands/diplodoc-helper.section.Reindex.js
const fs = require("fs");
const path = require("path");
const {
  FrontMatterFiles,
  FrontMatterSectionTypesIndexed,
} = require("../utils");
const { sectionTypes, getSectionMetadata } = require("../utils");
const {
  renameSectionFolderIfNeeded,
  loadTocFromFile,
  updateTocItemName,
  updateSectionMetadata,
  sortTocItems,
} = require("../utils");

/** @import {SectionTypeOption} from '../utils/diplodocTypes' */

/**
 * @typedef {Object} ReindexSectionParams
 * @property {string} dir
 * @property {string} sectionName
 * @property {number} localCounter
 * @property {string} [parentIndex]
 * @property {SectionTypeOption[]} localSectionTypes
 * @property {any} [tocDoc]
 */

/**
 * @typedef {Object} ReindexSectionResult
 * @property {string} sectionPath
 * @property {string} currentIndex
 * @property {string} newFolderName
 * @property {number} localCounter
 */

/**
 * Главная функция рекурсивной переиндексации
 * @param {string} dir
 * @param {string} parentIndex
 * @param {string} sortOrder
 * @param {string} sortKind
 */
function reindexDirectory(
  dir,
  parentIndex = "",
  sortOrder = "ascending",
  sortKind = "nonIndexedBottom",
) {
  console.log(`Переиндексация: ${path.relative(process.cwd(), dir) || "."}`);

  const items = fs.readdirSync(dir, { withFileTypes: true });

  const sections = items.filter(
    (item) =>
      item.isDirectory() &&
      fs.existsSync(path.join(dir, item.name, FrontMatterFiles.INDEX_MD)),
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
      console.error(`Ошибка загрузки toc.yaml в ${dir}`);
    }
  }

  for (const section of sections) {
    const result = reindexAndRenameSection({
      dir,
      sectionName: section.name,
      localCounter,
      parentIndex,
      localSectionTypes,
      tocDoc,
    });

    localCounter = result.localCounter;
    reindexDirectory(
      result.sectionPath,
      result.currentIndex || parentIndex,
      sortOrder,
      sortKind,
    );
  }

  // Сортировка после обработки всех детей
  if (tocDoc && sortOrder !== "none") {
    console.log(`   Сортируем toc.yaml (${sections.length} элементов)`);
    sortTocItems(dir, sortOrder, sortKind);
    console.log(`   toc.yaml отсортирован`);
  }
}

/**
 * Полная обработка одного раздела
 * @param {ReindexSectionParams} params
 * @returns {ReindexSectionResult}
 */
function reindexAndRenameSection({
  dir,
  sectionName,
  localCounter,
  parentIndex = "",
  localSectionTypes,
  tocDoc,
}) {
  const oldSectionPath = path.join(dir, sectionName);
  const indexMdPath = path.join(oldSectionPath, FrontMatterFiles.INDEX_MD);

  if (!fs.existsSync(indexMdPath)) {
    return {
      sectionPath: oldSectionPath,
      currentIndex: "",
      newFolderName: sectionName,
      localCounter,
    };
  }

  let content = fs.readFileSync(indexMdPath, "utf8");
  const metadata = getSectionMetadata(content);

  /** @type {SectionTypeOption} */
  const DEFAULT_SECTION_TYPE = /** @type {SectionTypeOption} */ ({
    name: "Page",
    label: "Статья",
    value: "",
  });

  const sectionTypeObj =
    localSectionTypes.find((st) => st.name === metadata.sectionType) ||
    DEFAULT_SECTION_TYPE;

  const sectionType = sectionTypeObj.name;
  const pureTitle = metadata.pureTitle || sectionName;
  let currentIndex = String(metadata.sectionIndex || "").trim();

  if (FrontMatterSectionTypesIndexed.includes(sectionType)) {
    const hadManualIndex = !!currentIndex;

    if (!currentIndex) {
      localCounter++;
      currentIndex = parentIndex
        ? `${parentIndex}.${localCounter}`
        : `${localCounter}`;
    } else {
      const parts = currentIndex.split(".");
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) {
        localCounter = Math.max(localCounter, lastNum);
      }
    }

    const sectionLabel = sectionTypeObj.label || "";
    const newTitle = `${sectionLabel} ${currentIndex}. ${pureTitle}`;

    updateSectionMetadata(
      oldSectionPath,
      pureTitle,
      sectionType,
      sectionLabel,
      currentIndex,
    );

    const newFolderName = renameSectionFolderIfNeeded(
      oldSectionPath,
      pureTitle,
      sectionTypeObj,
      currentIndex,
    );

    const newSectionPath = path.join(dir, newFolderName);

    if (tocDoc?.items) {
      updateTocItemName(tocDoc, sectionName, newTitle);
    }

    console.log(
      `   ${hadManualIndex ? "ручной" : "автоматический"} индекс ${currentIndex} - ${newFolderName}`,
    );

    return {
      sectionPath: newSectionPath,
      currentIndex,
      newFolderName,
      localCounter,
    };
  }

  // Для статей (Page) — не присваиваем индекс автоматически
  console.log(`   Статья без индекса: ${sectionName}`);

  return {
    sectionPath: oldSectionPath,
    currentIndex: "",
    newFolderName: sectionName,
    localCounter,
  };
}

module.exports = { reindexDirectory };
