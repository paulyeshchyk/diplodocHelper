// helpMap/Pagebuilder.common.js

// @ts-nocheck

const fs = require("fs");
const path = require("path");
const { outputFileName } = require("../helpMap/helpmap.config");

const { FILE_NAMES, SECTION_LABELS, SECTION_TYPES, FILE_EXTENSIONS } = require("./Pagebuilder.common.constants");

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

// ============================================================
// ФУНКЦИИ
// ============================================================

function parseUrlParts(url) {
  const parts = url.split("/").filter((p) => p);
  let sectionName = null;
  let chapterName = null;
  let articleFolder = null;

  if (parts.length >= 2) {
    const candidate = parts[1];
    if (candidate.endsWith(FILE_EXTENSIONS.HTML) || candidate.endsWith(FILE_EXTENSIONS.MARKDOWN)) {
      articleFolder = candidate.replace(/\.[^/.]+$/, "");
    } else if (candidate.startsWith(SECTION_TYPES.CHAPTER_PREFIX)) {
      chapterName = candidate;
      if (parts.length >= 3) {
        articleFolder = parts[2].replace(/\.[^/.]+$/, "");
      }
    } else {
      sectionName = candidate;
      if (parts.length >= 3) {
        const inner = parts[2];
        if (inner.startsWith(SECTION_TYPES.CHAPTER_PREFIX)) {
          chapterName = inner;
          if (parts.length >= 4) {
            articleFolder = parts[3].replace(/\.[^/.]+$/, "");
          }
        } else {
          articleFolder = inner.replace(/\.[^/.]+$/, "");
        }
      }
    }
  } else if (parts.length === 1 && (parts[0].endsWith(FILE_EXTENSIONS.HTML) || parts[0].endsWith(FILE_EXTENSIONS.MARKDOWN))) {
    articleFolder = parts[0].replace(/\.[^/.]+$/, "");
  }

  if (!articleFolder) {
    const last = parts[parts.length - 1] || "";
    articleFolder = last.replace(FILE_EXTENSIONS.HTML, "");
  }

  return { sectionName, chapterName, articleFolder };
}

function buildSectionsMap(articles) {
  const sectionsMap = new Map();

  for (const art of articles) {
    const { sectionName, chapterName, articleFolder } = parseUrlParts(art.url);
    const sectionKey = sectionName || SECTION_LABELS.NO_SECTION;
    if (!sectionsMap.has(sectionKey)) {
      const displayName = art.parents && art.parents.length > 0 ? art.parents[art.parents.length - 1] : sectionKey;
      sectionsMap.set(sectionKey, {
        name: sectionName,
        displayName,
        order: sectionName ? getSectionNumber(sectionName) : Infinity,
        chapters: new Map(),
        _rawChapters: [],
        _allArticles: [],
        _sectionArticles: [],
      });
    }
    const sectionData = sectionsMap.get(sectionKey);
    const isChapterArticle = chapterName !== null && (articleFolder === FILE_NAMES.INDEX || articleFolder === FILE_NAMES.INDEX_HTML);
    if (chapterName) {
      sectionData._rawChapters.push({ name: chapterName, globalNum: getChapterNumber(chapterName) });
    }
    sectionData._allArticles.push({ art, chapterName, articleFolder, isChapterArticle });
  }

  return sectionsMap;
}

function getChapterNumber(chapterName) {
  const m = chapterName.match(new RegExp(`^${SECTION_TYPES.CHAPTER_PREFIX}(\\d+)`));
  return m ? parseInt(m[1], 10) : null;
}

function getSectionNumber(sectionName) {
  const m = sectionName.match(new RegExp(`^${SECTION_TYPES.SECTION_PREFIX}(\\d+)`));
  return m ? parseInt(m[1], 10) : null;
}

function getArticleStatus(size, avg) {
  if (size < STATUS_THRESHOLDS.MIN_SIZE) return ARTICLE_STATUS.EMPTY;
  const ratio = avg ? size / avg : 0;
  if (ratio > STATUS_THRESHOLDS.EXCESS_RATIO) return ARTICLE_STATUS.EXCESS;
  if (ratio >= STATUS_THRESHOLDS.FULL_RATIO) return ARTICLE_STATUS.FULL;
  if (ratio >= STATUS_THRESHOLDS.PARTIAL_RATIO) return ARTICLE_STATUS.PARTIAL;
  return ARTICLE_STATUS.MINIMUM;
}

function buildMatrix(data, lang) {
  const filtered = data.filter((item) => item.lang === lang && item.title && item.title.trim() !== "");

  const sizes = filtered.map((item) => item.size || 0);
  const avg = sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;

  const articles = filtered.map((item) => {
    const size = item.size || 0;
    const status = getArticleStatus(size, avg);
    return { ...item, size, status };
  });

  const sectionsMap = buildSectionsMap(articles);

  for (const [, sectionData] of sectionsMap) {
    const chapters = calculateChapterOrder(sectionData);
    sectionData.chapters = chapters;
    distributeArticles(sectionData);
  }

  const { matrix, rows, cols } = buildMatrixFromSections(sectionsMap);

  return {
    matrix,
    rows,
    cols,
    avgSize: avg,
    totalArticles: articles.length,
  };
}

function calculateChapterOrder(sectionData) {
  const chaptersMap = new Map();
  for (const ch of sectionData._rawChapters) {
    const key = ch.name;
    if (!chaptersMap.has(key)) {
      chaptersMap.set(key, { name: key, globalNum: ch.globalNum, articles: [] });
    }
  }
  const sorted = Array.from(chaptersMap.values()).sort((a, b) => {
    if (a.globalNum === null && b.globalNum === null) return a.name.localeCompare(b.name);
    if (a.globalNum === null) return 1;
    if (b.globalNum === null) return -1;
    return a.globalNum - b.globalNum;
  });
  sorted.forEach((ch, idx) => {
    ch.order = idx + 1;
  });
  const chapters = new Map();
  for (const ch of sorted) {
    chapters.set(ch.order, { name: ch.name, articles: [] });
  }
  return chapters;
}

function distributeArticles(sectionData) {
  const chapters = sectionData.chapters;
  const noChapterArticles = [];
  for (const entry of sectionData._allArticles) {
    const chName = entry.chapterName;
    if (chName) {
      let found = false;
      for (const [order, chData] of chapters) {
        if (chData.name === chName) {
          chData.articles.push({ ...entry.art, isChapterArticle: entry.isChapterArticle });
          found = true;
          break;
        }
      }
      if (!found) {
        noChapterArticles.push({ ...entry.art, isChapterArticle: false });
      }
    } else {
      const isSectionArticle = (entry.articleFolder === FILE_NAMES.INDEX || entry.articleFolder === FILE_NAMES.INDEX_HTML) && sectionData.name !== null;
      if (isSectionArticle) {
        sectionData._sectionArticles.push({ ...entry.art, isChapterArticle: false });
      } else {
        noChapterArticles.push({ ...entry.art, isChapterArticle: false });
      }
    }
  }
  const maxOrder = Math.max(0, ...chapters.keys());
  chapters.set(maxOrder + 1, { name: SECTION_LABELS.NO_CHAPTER, articles: noChapterArticles });
}

function buildMatrixFromSections(sectionsMap) {
  let maxChapters = 0;
  for (const [, sectionData] of sectionsMap) {
    const count = sectionData.chapters.size;
    if (count > maxChapters) maxChapters = count;
  }

  const sortedSections = Array.from(sectionsMap.keys()).sort((a, b) => {
    const aOrder = sectionsMap.get(a).order;
    const bOrder = sectionsMap.get(b).order;
    if (aOrder === Infinity && bOrder === Infinity) return a.localeCompare(b);
    if (aOrder === Infinity) return 1;
    if (bOrder === Infinity) return -1;
    return aOrder - bOrder;
  });

  const cols = sortedSections.map((key) => ({
    key: key,
    displayName: sectionsMap.get(key).displayName,
  }));

  const matrix = [];

  const sectionRow = [];
  for (const sectionKey of sortedSections) {
    const sectionData = sectionsMap.get(sectionKey);
    sectionRow.push(sectionData._sectionArticles || []);
  }
  matrix.push(sectionRow);

  for (let row = 1; row <= maxChapters; row++) {
    const rowData = [];
    for (const sectionKey of sortedSections) {
      const sectionData = sectionsMap.get(sectionKey);
      let articles = [];
      for (const [order, chData] of sectionData.chapters) {
        if (order === row && chData.name !== SECTION_LABELS.NO_CHAPTER) {
          articles = chData.articles;
          break;
        }
      }
      rowData.push(articles);
    }
    matrix.push(rowData);
  }

  const extraRow = [];
  for (const sectionKey of sortedSections) {
    const sectionData = sectionsMap.get(sectionKey);
    let noChapterArticles = [];
    for (const [order, chData] of sectionData.chapters) {
      if (chData.name === SECTION_LABELS.NO_CHAPTER) {
        noChapterArticles = chData.articles;
        break;
      }
    }
    extraRow.push(noChapterArticles);
  }
  matrix.push(extraRow);

  const rowLabels = [SECTION_LABELS.SECTION_CONTENT];

  // Расчёт порядкового номера главы ( Глава 01)
  const safeMaxChapters = Math.max(1, Number(maxChapters) || 1);
  const leadingLength = String(safeMaxChapters).length;

  for (let i = 1; i <= safeMaxChapters; i++) {
    const formattedNum = String(i).padStart(leadingLength, "0");
    rowLabels.push(`${formattedNum}`);
  }
  rowLabels.push(SECTION_LABELS.OTHER);

  const filteredMatrix = [];
  const filteredRowLabels = [];
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    // Проверяем, есть ли хотя бы одна непустая ячейка в строке
    const hasAnyArticle = row.some((cell) => cell.length > 0);
    if (hasAnyArticle) {
      filteredMatrix.push(row);
      filteredRowLabels.push(rowLabels[r]);
    }
  }
  return { matrix: filteredMatrix, rows: filteredRowLabels, cols };
}

function buildStatusMatrix(matrixData, aggregator, classifier) {
  const { matrix, rows, cols } = matrixData;
  const statusMatrix = matrix.map((row) =>
    row.map((cell) => {
      const value = aggregator(cell);
      const classification = classifier(value);
      return { value, ...classification };
    }),
  );
  return { matrix: statusMatrix, rows, cols };
}

function renderFile(outputDir, filename) {
  const jsCoreSrcPath = path.join(__dirname, filename);
  if (fs.existsSync(jsCoreSrcPath)) {
    fs.copyFileSync(jsCoreSrcPath, path.join(outputDir, filename));
  } else {
    console.warn(`⚠️ File was not rendered: ${jsCoreSrcPath}`);
  }
}

function generateGenericTableFromArticles({ mapDir, outputDir, lang, htmlFileName, cssFileName, jsFileName, dataFileName, title, legendItems, matrixBuilder, navLinks = [] }) {
  const jsonPath = path.join(mapDir, outputFileName);
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File ${jsonPath} was not found. app-help-contents.json should be generated first`);
    return;
  }

  const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const langs = Array.isArray(lang) ? lang : [lang];
  const languageData = {};
  for (const l of langs) {
    const matrixData = matrixBuilder(jsonData, l);
    languageData[l] = matrixData;
  }

  const dataToExport = {
    matrixData: languageData,
    legendItems,
    navLinks,
  };

  const templatePath = path.join(__dirname, "page-template.html");
  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template ${templatePath} was not found`);
    return;
  }

  const dataJson = JSON.stringify(dataToExport);
  const dataFilePath = path.join(outputDir, dataFileName);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(dataFilePath, `const periodicData = ${dataJson};`, "utf8");

  // Копируем CSS и JS

  renderFile(outputDir, cssFileName);

  renderFile(outputDir, jsFileName);

  renderFile(outputDir, "core-renderer.js");

  renderFile(outputDir, "core-style.css");

  const js_link = `<script src="core-renderer.js" defer></script>\n<script src="${jsFileName}" defer></script>`;
  const data_link = `<script src="${dataFileName}" defer></script>`;
  const css_link = `<link rel="stylesheet" href="core-style.css">\n<link rel="stylesheet" href="${cssFileName}">`;

  let template = fs.readFileSync(templatePath, "utf8");
  template = template.replace("{{CSS_LINK}}", css_link);
  template = template.replace("{{DATA_LINK}}", data_link);
  template = template.replace("{{JS_LINK}}", js_link);
  template = template.replaceAll("{{TITLE}}", title);

  fs.writeFileSync(path.join(outputDir, htmlFileName), template, "utf8");

  // console.log(`✓ Таблица сохранена: ${path.join(outputDir, htmlFileName)}`);
}

module.exports = { generateGenericTableFromArticles, buildMatrix };
