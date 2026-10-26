// contextmap.js

// @ts-nocheck

const contextmapConfig = {
  colorMap: {
    empty: "color-empty",
    low: "color-low",
    normal: "color-normal",
    excess: "color-excess",
  },
  getTitle(art) {
    let title = art.title;
    if (art.context && art.context.trim() !== "") {
      title += "\n" + art.context.trim();
    }
    return title;
  },
  getStatsHTML(lang, matrixData, t) {
    const statusCounts = {};
    let total = 0;
    for (const row of matrixData.matrix) {
      for (const cell of row) {
        for (const art of cell) {
          statusCounts[art.status] = (statusCounts[art.status] || 0) + 1;
          total++;
        }
      }
    }
    const statsText = Object.entries(statusCounts)
      .map(([status, count]) => `${ARTICLE_STATUS_I18N(status)}: ${count}`)
      .join("; ");
    return `<span>${t.langLabel}: ${lang}</span> &nbsp;|&nbsp; <span>${t.totalArticlesLabel}:<span style="color: red;"> ${total}</span></span> &nbsp;|&nbsp; <span>${statsText}</span>`;
  },
};

const ARTICLE_STATUS_I18N_TEXTS = {
  ru: {
    empty: "Без контекста",
    normal: "Нормально",
    low: "Мало контекстов",
    excess: "Избыточно",
  },
  en: {
    empty: "No context",
    normal: "Normal",
    low: "Few contexts",
    excess: "Excess",
  },
};

function ARTICLE_STATUS_I18N(status) {
  const uiLang = document.documentElement.lang || "ru";
  const t = ARTICLE_STATUS_I18N_TEXTS[uiLang] || ARTICLE_STATUS_I18N_TEXTS.ru;
  return t[status] || status;
}

function renderAll(matrixDataMap, navLinks) {
  initApp(matrixDataMap, navLinks, contextmapConfig);
}
