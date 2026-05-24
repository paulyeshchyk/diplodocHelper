// src/core/reindex.js
const fs = require("fs");
const path = require("path");

const {
  FrontMatterFiles,
  FrontMatterSectionTypesIndexed,
} = require("../utils/constants");

const { getSectionMetadata, sectionTypes } = require("../utils/section");
const {
  renameSectionFolderIfNeeded,
  TocYamlFileLoad,
  TocYamlEntryPatch,
  IndexMdEntryPatch,
  sortTocItems,
} = require("../utils");

const { IndexMdFileRead } = require("../utils/index.md.file");

/** @import {SectionTypeOption} from '../utils/diplodocTypes' */

/**
 * @typedef {Object} ReindexWarning
 * @property {string} type - "missingSectionType" | "titleHasPrefix"
 * @property {string} message
 * @property {string} sectionPath
 */

/**
 * @typedef {Object} ReindexResult
 * @property {string} sectionPath
 * @property {string} currentIndex
 * @property {string} newFolderName
 * @property {number} localCounter
 * @property {ReindexWarning[]} warnings
 */

/**
 * Главная функция рекурсивной переиндексации (чистая логика)
 * @param {string} dir
 * @param {string} parentIndex
 * @param {string} sortOrder
 * @param {string} sortKind
 * @returns {ReindexWarning[]}
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

  if (sections.length === 0) return [];

  /** @type {ReindexWarning[]} */
  let allWarnings = [];

  const localSectionTypes = sectionTypes();
  let localCounter = 0;

  const tocPath = path.join(dir, FrontMatterFiles.TOC_YAML);
  let tocDoc = null;

  if (fs.existsSync(tocPath)) {
    try {
      tocDoc = TocYamlFileLoad(tocPath);
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

    allWarnings = allWarnings.concat(result.warnings || []);
    localCounter = result.localCounter;

    // Рекурсия
    const childWarnings = reindexDirectory(
      result.sectionPath,
      result.currentIndex || parentIndex,
      sortOrder,
      sortKind,
    );
    allWarnings = allWarnings.concat(childWarnings);
  }

  // Сортировка
  if (tocDoc && sortOrder !== "none") {
    console.log(`   Сортируем toc.yaml (${sections.length} элементов)`);
    sortTocItems(dir, sortOrder, sortKind);
    console.log(`   toc.yaml отсортирован`);
  }

  return allWarnings;
}

/**
 * @param {Object} params
 * @param {string} params.dir
 * @param {string} params.sectionName
 * @param {number} params.localCounter
 * @param {string} [params.parentIndex]
 * @param {SectionTypeOption[]} params.localSectionTypes
 * @param {any} [params.tocDoc]
 * @returns {ReindexResult}
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
      warnings: [],
    };
  }

  const content = fs.readFileSync(indexMdPath, "utf8");
  const metadata = getSectionMetadata(content);

  /** @type {ReindexWarning[]} */
  const warnings = [];

  // === Новые проверки ===
  checkMissingSectionType(metadata, oldSectionPath, warnings);
  checkTitleHasPrefix(metadata, oldSectionPath, warnings);

  /** @type {SectionTypeOption} */
  const DEFAULT_SECTION_TYPE = {
    name: "Page",
    label: "Статья",
    value: "",
    description: "",
  };

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

    IndexMdEntryPatch(
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
      TocYamlEntryPatch(tocDoc, sectionName, newTitle);
    }

    console.log(
      `   ${hadManualIndex ? "manual" : "auto"} index ${currentIndex} - ${newFolderName}`,
    );

    return {
      sectionPath: newSectionPath,
      currentIndex,
      newFolderName,
      localCounter,
      warnings,
    };
  }

  console.log(`no index for section: ${sectionName}`);

  return {
    sectionPath: oldSectionPath,
    currentIndex: "",
    newFolderName: sectionName,
    localCounter,
    warnings,
  };
}

/**
 * @param {any} metadata
 * @param {string} sectionPath
 * @param {ReindexWarning[]} warnings
 */
function checkMissingSectionType(metadata, sectionPath, warnings) {
  if (!metadata.sectionType || metadata.sectionType.trim() === "") {
    warnings.push({
      type: "missingSectionType",
      message: `Присвойте тип для раздела "${path.basename(sectionPath)}"`,
      sectionPath,
    });
  }
}

/**
 * @param {any} metadata
 * @param {string} sectionPath
 * @param {ReindexWarning[]} warnings
 */
function checkTitleHasPrefix(metadata, sectionPath, warnings) {
  if (metadata.pureTitle) return; // если pureTitle есть — считаем, что всё ок

  const title = metadata.title || "";
  if (!title) return;

  const prefixes = ["Часть", "Раздел", "Глава"];

  for (const prefix of prefixes) {
    if (title.startsWith(prefix + " ") || title.startsWith(prefix + ".")) {
      warnings.push({
        type: "titleHasPrefix",
        message: `Переименуйте статью "${title}"`,
        sectionPath,
      });
      break;
    }
  }
}

module.exports = {
  reindexDirectory,
};
