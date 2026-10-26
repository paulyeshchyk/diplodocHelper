// bytescounter.js

// @ts-nocheck

const bytescounterConfig = {
    colorMap: {
        'excess': 'color-excess',
        'full': 'color-full',
        'partial': 'color-partial',
        'minimum': 'color-minimum',
        'empty': 'color-empty'
    },
    getTitle(art, t) {
        return `${art.title} (${art.size} ${t.bytes})`;
    },
    getStatsHTML(lang, matrixData, t) {
        return `
            <span>${t.langLabel}: ${lang}</span> &nbsp;|&nbsp;
            <span>${t.totalArticlesLabel}: <span style="color: red;">${matrixData.totalArticles}</span></span> &nbsp;|&nbsp;
            <span>${t.avgSizeLabel}: ${Math.round(matrixData.avgSize)} ${t.bytes}</span>
        `;
    }
};

function renderAll(matrixDataMap, navLinks) {
    initApp(matrixDataMap, navLinks, bytescounterConfig);
}