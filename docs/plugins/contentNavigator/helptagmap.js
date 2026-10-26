// helptagmap.js

// @ts-nocheck

const helptagmapConfig = {
    colorMap: {
        'empty': 'color-empty',
        'normal': 'color-normal',
        'excess': 'color-excess',
    },
    getTitle(art) {
        let title = art.title;
        if (art.helptag && art.helptag.trim() !== '') {
            title += '\n' + art.helptag.trim();
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
        const statsText = Object.entries(statusCounts).map(([status, count]) => `${ARTICLE_STATUS_I18N(status)}: ${count}`).join('; ');
        return `<span>${t.langLabel}: ${lang}</span> &nbsp;|&nbsp; <span>${t.totalArticlesLabel}: <span style="color: red;"> ${total}</span></span> &nbsp;|&nbsp; <span>${statsText}</span>`;
    }
};

const ARTICLE_STATUS_I18N_TEXTS = {
    ru: {
        empty: 'Без тэгов',
        normal: 'Один тэг',
        excess: 'Избыточно'
    },
    en: {
        empty: 'No tags',
        normal: 'Single tag',
        excess: 'Excess'
    }
};

function ARTICLE_STATUS_I18N(status)
{
    const uiLang = document.documentElement.lang || 'ru';
    const t = ARTICLE_STATUS_I18N_TEXTS[uiLang] || ARTICLE_STATUS_I18N_TEXTS.ru;
    return t[status] || status;
}
function renderAll(matrixDataMap, navLinks) {
    initApp(matrixDataMap, navLinks, helptagmapConfig);
}