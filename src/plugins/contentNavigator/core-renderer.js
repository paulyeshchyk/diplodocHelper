// core-renderer.js

// @ts-nocheck

const I18N = {
    ru: {
        noData: 'Нет данных для этого языка.',
        noArticles: 'Нет статей для этого языка.',
        chapterHeader: '№ главы<br/> в разделе',
        langLabel: 'Язык',
        totalArticlesLabel: 'Всего статей',
        avgSizeLabel: 'Средний размер',
        bytes: 'байт'
    },
    en: {
        noData: 'No data for this language.',
        noArticles: 'No articles for this language.',
        chapterHeader: 'Chapter index in section',
        langLabel: 'Language',
        totalArticlesLabel: 'Total articles',
        avgSizeLabel: 'Average size',
        bytes: 'bytes'
    }
};

const uiLang = document.documentElement.lang || 'ru';
const t = I18N[uiLang] || I18N.ru;

/**
 * @param {any[]} navLinks
 * @param {HTMLElement | null | undefined} [container]
 */
function renderNavLinks(navLinks, container) {
    if (!container) {
        container = document.getElementById('nav-links');
        if (!container) {
            console.warn('nav-links container not found');
            return;
        }
    }
    container.innerHTML = navLinks.map((/** @type {{ url: any; label: any; }} */ link) => `<a href="${link.url}">${link.label}</a>`).join('');
}

/**
 * @param {any} legendItems
 * @param {HTMLElement | null} container
 */
function renderLegend(legendItems, container) {
    if (!container) {
        container = document.getElementById('legend-container');
        if (!container) {
            console.warn('Legend container not found');
            return;
        }
    }
    let html = '<div class="legend">';
    for (const item of legendItems) {
        html += `<div class="legend-item"><span class="legend-color ${item.color}"></span> ${item.description}</div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

/**
 * @param {{ status: string | number; value: undefined; label: any; }} status
 * @param {{ innerHTML: string; }} container
 */
function renderStatusCell(status, container) {
    if (!container) return;
    const colorMap = {
        'empty': 'color-empty',
        'normal': 'color-normal',
        'excess': 'color-excess',
        'low': 'color-low',
    };
    const colorClass = colorMap[status.status] || 'color-empty';
    const displayText = status.value !== undefined ? status.value : '';
    container.innerHTML = `<div class="status-cell ${colorClass}" title="${status.label}: ${status.value}">${displayText}</div>`;
}

/**
 * @param {any[]} articles
 * @param {HTMLElement} container
 * @param {{ colorMap: { [x: string]: string; }; getTitle: (arg0: any, arg1: any) => any; }} config
 */
function renderArticles(articles, container, config) {
    if (!articles || articles.length === 0) {
        container.innerHTML = '·';
        return;
    }

    articles.sort((/** @type {{ isChapterArticle: any; }} */ a, /** @type {{ isChapterArticle: any; }} */ b) => (b.isChapterArticle ? 1 : 0) - (a.isChapterArticle ? 1 : 0));

    const count = articles.length;
    const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
    let html = `<div style="display:grid; grid-template-columns: repeat(${cols}, 3ch); gap:3px; justify-content:center; align-content:start; width:100%; height:100%;">`;

    for (const art of articles) {
        const colorClass = config.colorMap[art.status] || 'color-empty';
        const title = config.getTitle(art, t);
        const borderClass = art.isChapterArticle ? 'chapter-article' : '';
        html += `<a href="${art.url}" target="_blank" class="article-block ${colorClass} ${borderClass}" title="${title}"></a>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

/**
 * @param {string} lang
 * @param {{ totalArticles?: any; matrix?: any; rows?: any; cols?: any; }} matrixData
 * @param {{ getStatsHTML: (arg0: any, arg1: any, arg2: any) => string; }} config
 */
function renderTable(lang, matrixData, config) {
    const container = document.getElementById('table-container');
    if (!matrixData) {
        container.innerHTML = `<p>${t.noData}</p>`;
        return;
    }

    const { matrix, rows, cols } = matrixData;
    const statsEl = document.getElementById('stats');

    // Отрисовка кастомной статистики
    if (statsEl) {
        statsEl.innerHTML = config.getStatsHTML(lang, matrixData, t);
    }

    if (matrixData.totalArticles === 0) {
        container.innerHTML = `<p style="padding:20px;">${t.noArticles}</p>`;
        return;
    }

    let html = '<div class="table-wrapper"><table>';
    html += `<thead><tr><th><div class="th-text-clamp"style="--line-count: 2;">${t.chapterHeader}</div></th>`;
    for (const col of cols) {
        html += `<th title="${col.displayName}"><div class="th-text-clamp"style="--line-count: 2;">${col.displayName}</div></th>`;
    }
    html += '</tr></thead><tbody>';

    for (let r = 0; r < rows.length; r++) {
        html += `<tr><td class="rowHeader">${rows[r]}</td>`;
        const rowData = matrix[r];
        for (let c = 0; c < rowData.length; c++) {
            html += `<td><div id="cell-${r}-${c}"></div></td>`;
        }
        html += '</tr>';
    }
    html += '</tbody></table></div>';
    container.innerHTML = html;

    for (let r = 0; r < rows.length; r++) {
        const rowData = matrix[r];
        for (let c = 0; c < rowData.length; c++) {
            const cellDiv = document.getElementById(`cell-${r}-${c}`);
            if (cellDiv) {
                renderArticles(rowData[c], cellDiv, config);
            }
        }
    }

    document.querySelectorAll('#lang-selector button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
}

/**
 * @param {{ [x: string]: any; }} matrixDataMap
 * @param {any} config
 * @param {string | null} savedLang
 */
function renderLang(matrixDataMap, config, savedLang) {
    const langs = Object.keys(matrixDataMap);
    // Если сохранённый язык есть в списке – берём его, иначе первый
    let currentLang = (savedLang && langs.includes(savedLang)) ? savedLang : langs[0];

    const selector = document.getElementById('lang-selector');
    if (selector) {
        if (langs.length > 1) {
            selector.innerHTML = '';
            for (const lang of langs) {
                const btn = document.createElement('button');
                btn.textContent = lang.toUpperCase();
                btn.dataset.lang = lang;
                btn.addEventListener('click', () => {
                    currentLang = lang;
                    // ----- СОХРАНЯЕМ ВЫБОР -----
                    localStorage.setItem('preferredLang', lang);
                    renderTable(lang, matrixDataMap[lang], config);
                });
                selector.appendChild(btn);
            }
        } else {
            selector.style.display = 'none';
        }
    }
    return currentLang;
}


/**
 * @param {{ [x: string]: any; }} matrixDataMap
 * @param {any} navLinks
 * @param {{ colorMap: { empty: string; low: string; normal: string; excess: string; } | { excess: string; full: string; partial: string; minimum: string; empty: string; } | { empty: string; normal: string; excess: string; }; getTitle: ((art: { title: any; context: string; }) => any) | ((art: { title: any; size: any; }, t: { bytes: any; }) => string) | ((art: any) => any); getStatsHTML: ((lang: any, matrixData: { matrix: any; }, t: { langLabel: any; totalArticlesLabel: any; }) => string) | ((lang: any, matrixData: { totalArticles: any; avgSize: number; }, t: { langLabel: any; totalArticlesLabel: any; avgSizeLabel: any; bytes: any; }) => string) | ((lang: any, matrixData: any, t: any) => string); }} config
 */
function initApp(matrixDataMap, navLinks, config) {
    // Читаем сохранённый язык из localStorage
    const savedLang = localStorage.getItem('preferredLang');
    let currentLang = renderLang(matrixDataMap, config, savedLang);
    document.documentElement.lang = currentLang;
    renderNavLinks(navLinks);
    renderTable(currentLang, matrixDataMap[currentLang], config);
}