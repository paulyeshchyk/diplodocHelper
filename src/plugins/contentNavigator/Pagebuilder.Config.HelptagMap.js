// helpMap/helpmap.periodic.helptag.js

// @ts-nocheck

const { buildMatrix, generateGenericTableFromArticles } = require("./Pagebuilder.common");

function getHelptagStatus(art) {
  const hasHelptag = art.helptag && art.helptag.trim() !== "";
  const count = hasHelptag ? 1 : 0;
  if (count === 0) return { status: "empty", label: "Нет helptag" };
  if (count === 1) return { status: "normal", label: "Один helptag" };
  return { status: "excess", label: ">1 helptag" };
}

function buildHelptagMatrix(jsonData, lang) {
  const matrixData = buildMatrix(jsonData, lang);
  const newMatrix = matrixData.matrix.map((row) =>
    row.map((cell) =>
      cell.map((art) => {
        const statusInfo = getHelptagStatus(art);
        return { ...art, status: statusInfo.status };
      }),
    ),
  );
  return {
    matrix: newMatrix,
    rows: matrixData.rows,
    cols: matrixData.cols,
    totalArticles: matrixData.totalArticles,
  };
}

function generateHelpTagPage({ mapDir, outputDir, lang = "ru" }) {
  const navLinks = [
    { label: "Размеры", url: "bytescounter.html" },
    { label: "Контексты", url: "contextmap.html" },
  ];
  const legendItems = [
    { color: "color-excess", description: "&gt;1 helptag" },
    { color: "color-normal", description: "Один helptag" },
    { color: "color-empty", description: "Нет helptag (0)" },
    { color: "chapter-article", description: "Текст главы" },
  ];
  return generateGenericTableFromArticles({
    mapDir,
    outputDir,
    lang,
    htmlFileName: "helptagmap.html",
    cssFileName: "helptagmap.css",
    jsFileName: "helptagmap.js",
    dataFileName: "helptagmap.data.js",
    title: "Распределение helptag по разделам и главам",
    legendItems,
    matrixBuilder: buildHelptagMatrix,
    navLinks,
  });
}

module.exports = { generateHelpTagPage };
