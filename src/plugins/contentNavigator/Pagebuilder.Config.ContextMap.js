// helpMap/helpmap.periodic.context.js

// @ts-nocheck

const { buildMatrix, generateGenericTableFromArticles } = require('./Pagebuilder.common');

const CONTEXTS_SPLITTER = ',';

function getContextStatus(art) {
    const context = art.context || '';
    const parts = context.split(CONTEXTS_SPLITTER).map(s => s.trim()).filter(s => s !== '');
    const count = parts.length;
    if (count === 0) return { status: 'empty', label: 'Нет context' };
    if (count <= 3) return { status: 'low', label: 'Мало (1–3)' };
    if (count <= 6) return { status: 'normal', label: 'Норма (4–6)' };
    return { status: 'excess', label: 'Избыток (>6)' };
}

function buildContextMatrix(jsonData, lang) {
    const matrixData = buildMatrix(jsonData, lang);
    const newMatrix = matrixData.matrix.map(row =>
        row.map(cell =>
            cell.map(art => {
                const statusInfo = getContextStatus(art);
                return { ...art, status: statusInfo.status };
            })
        )
    );
    return {
        matrix: newMatrix,
        rows: matrixData.rows,
        cols: matrixData.cols,
        totalArticles: matrixData.totalArticles,
    };
}

function generateContextsPage({ mapDir, outputDir, lang = 'ru' }) {
    const legendItems = [
        { color: 'color-excess', description: 'Избыток (>6)' },
        { color: 'color-normal', description: 'Норма (4–6)' },
        { color: 'color-low', description: 'Мало (1–3)' },
        { color: 'color-empty', description: 'Нет context (0)' },
        { color: "chapter-article", description: "Текст главы" }
    ];
    const navLinks = [
        { label: 'Хэлптэги', url: 'helptagmap.html' },
        { label: 'Размеры', url: 'bytescounter.html' },
    ];
    return generateGenericTableFromArticles({
        mapDir,
        outputDir,
        lang,
        htmlFileName: 'contextmap.html',
        cssFileName: 'contextmap.css',
        jsFileName: 'contextmap.js',
        dataFileName: 'contextmap.data.js',
        title: 'Распределение context по разделам и главам',
        legendItems,
        matrixBuilder: buildContextMatrix,
        navLinks,
    });
}

module.exports = { generateContextsPage };