// @ts-nocheck

/** @type {PagebuilderConfig} */
const bytescounterConfig = {
    colorMap: {
        excess: 'color-excess',
        full: 'color-full',
        partial: 'color-partial',
        minimum: 'color-minimum',
        empty: 'color-empty',
    },
    /**
     * @param {PagebuilderArticle} art
     * @param {PagebuilderI18n} t
     * @returns {string}
     */
    getTitle(art, t) {
        return `${art.title} (${art.size} ${t.bytes})`;
    },
    /**
     * @param {string} lang
     * @param {PagebuilderMatrixData} matrixData
     * @param {PagebuilderI18n} t
     * @returns {string}
     */
    getStatsHTML(lang, matrixData, t) {
        const avg = Math.round(matrixData.avgSize ?? 0);
        const total = matrixData.totalSize.toLocaleString(lang);
        return `
            <span>${t.langLabel}: ${lang}</span> &nbsp;|&nbsp;
            <span>${t.totalArticlesLabel}: <span style="color: red;">${matrixData.totalArticles}</span></span> &nbsp;|&nbsp;
            <span>${t.avgSizeLabel}: ${avg} ${t.bytes}</span> &nbsp;|&nbsp;
            <span>${t.totalSizeLabel}: ${total} ${t.bytes}</span>
        `;
    },
};

/**
 * @param {Record<string, PagebuilderMatrixData>} matrixDataMap
 * @param {PagebuilderNavLink[]} navLinks
 */
function renderAll(matrixDataMap, navLinks) {
    initApp(matrixDataMap, navLinks, bytescounterConfig);
}