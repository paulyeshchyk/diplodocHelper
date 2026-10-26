// helpMap/helpmap.periodic.js

// @ts-nocheck

const fs = require("fs");
const path = require("path");
const { outputFileName } = require("../helpMap/helpmap.config");
const { generateGenericTableFromArticles, buildMatrix } = require("./Pagebuilder.common");
const { SECTION_TYPES, SECTION_LABELS, FILE_NAMES } = require("./Pagebuilder.common.constants");

const LOG_TEMPLATES = {
  TABLE_SAVED: "✓ Периодическая таблица сохранена: {path}",
  JSON_NOT_FOUND: "❌ Файл {path} не найден. Сначала сгенерируйте app-help-contents.json",
  TEMPLATE_NOT_FOUND: "❌ Шаблон {path} не найден",
  SCRIPT_NOT_FOUND: "❌ Скрипт {path} не найден",
  CSS_NOT_FOUND: "⚠️ CSS-файл не найден: {path}, стили не будут загружены",
};

const STATUS_THRESHOLDS = {
  MIN_SIZE: 490,
  PARTIAL_RATIO: 0.5,
  FULL_RATIO: 0.8,
  EXCESS_RATIO: 1.2,
};

const ARTICLE_STATUS = {
  EMPTY: "empty",
  MINIMUM: "minimum",
  PARTIAL: "partial",
  FULL: "full",
  EXCESS: "excess",
};

const DEFAULT_HTML_FILENAME = "bytescounter.html";
const DEFAULT_JS_FILENAME = "bytescounter.js";
const DEFAULT_CSS_FILENAME = "bytescounter.css";
const DEFAULT_DATA_FILENAME = "bytescounter.data.js";

const LEGEND_ITEMS = [
  { color: "color-excess", description: "Избыток (&gt;120% от среднего)" },
  { color: "color-full", description: "Заполнена (≥80% от среднего)" },
  { color: "color-partial", description: "Частично (50–80%)" },
  { color: "color-minimum", description: "Минимально (≥490 байт, &lt;50%)" },
  { color: "color-empty", description: "Пустая (&lt;490 байт)" },
  { color: "chapter-article", description: "Текст главы" }
];

// ============================================================
// ФУНКЦИИ
// ============================================================

function getArticleStatus(size, avg) {
  if (size < STATUS_THRESHOLDS.MIN_SIZE) return ARTICLE_STATUS.EMPTY;
  const ratio = avg ? size / avg : 0;
  if (ratio > STATUS_THRESHOLDS.EXCESS_RATIO) return ARTICLE_STATUS.EXCESS;
  if (ratio >= STATUS_THRESHOLDS.FULL_RATIO) return ARTICLE_STATUS.FULL;
  if (ratio >= STATUS_THRESHOLDS.PARTIAL_RATIO) return ARTICLE_STATUS.PARTIAL;
  return ARTICLE_STATUS.MINIMUM;
}

function isChapterName(name) {
  return new RegExp(`^${SECTION_TYPES.CHAPTER_PREFIX}\\d+`).test(name);
}
function buildSizeMatrix(jsonData, lang) {
  return buildMatrix(jsonData, lang);
}

function generateBytesCounterPage({ mapDir, outputDir, lang = 'ru' }) {
  const navLinks = [
    { label: 'Контексты', url: 'contextmap.html' },
    { label: 'Хелптаги', url: 'helptagmap.html' },
  ];
  return generateGenericTableFromArticles({
    mapDir,
    outputDir,
    lang,
    htmlFileName: DEFAULT_HTML_FILENAME,
    cssFileName: DEFAULT_CSS_FILENAME,
    jsFileName: DEFAULT_JS_FILENAME,
    dataFileName: DEFAULT_DATA_FILENAME,
    title: 'Распределение размера статей по разделам и главам',
    legendItems: LEGEND_ITEMS,
    matrixBuilder: buildSizeMatrix,
    navLinks: navLinks,
  });
}

module.exports = { generateBytesCounterPage };
