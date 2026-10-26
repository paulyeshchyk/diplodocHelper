// @ts-nocheck

// modules/map.js

const { slugify_filename } = require('../../utils/encoding.slugify');
const { resolveMetric } = require('./metrics');
const { pickLocalized } = require('./metrics');

// =====================================================================
// 1. ПАЛИТРА (Viridis: yellow → teal → plum)
// =====================================================================

/** @typedef {[number, number, number]} Rgb */

/** @type {Rgb} */ const COLOR_LOW = [253, 231, 37]; // #FDE725 — редко
/** @type {Rgb} */ const COLOR_MID = [33, 145, 140]; // #21918C — средне
/** @type {Rgb} */ const COLOR_HIGH = [68, 1, 84]; // #440154 — часто
/** @type {Rgb} */ const COLOR_GREY = [158, 158, 158]; // tail

const DEFAULT_PIVOT = 16;

/**
 * Трёхстоповая шкала: yellow → teal → plum.
 * @param {number} value
 * @param {number} maxValue
 * @param {number} pivot — точка стыка teal (обычно ~14-20% от max)
 * @returns {Rgb}
 */
function pickFillRgb(value, maxValue, pivot = DEFAULT_PIVOT) {
    const max = Math.max(maxValue, pivot + 1);
    if (value >= pivot) {
        const t = Math.min(1, (value - pivot) / (max - pivot));
        return lerpRgb(COLOR_MID, COLOR_HIGH, t);
    }
    const t = Math.min(1, Math.max(0, value / pivot));
    return lerpRgb(COLOR_LOW, COLOR_MID, t);
}

/** @returns {Rgb} */
function lerpRgb(/** @type {Rgb} */ a, /** @type {Rgb} */ b, /** @type {number} */ t) {
    return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
    ];
}

function rgbCss(/** @type {Rgb} */ rgb) {
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/** Тёмный текст на светлом фоне, белый — на тёмном (Rec. 601) */
function pickTextColor(/** @type {Rgb} */ rgb) {
    const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return lum > 0.55 ? '#1a1a1a' : '#ffffff';
}

// =====================================================================
// 2. МЕТКА: подбор шрифта и раскладка
// =====================================================================

const CHAR_W_FACTOR = 0.62;
const LABEL_PADDING = 12;
const MIN_FONT = 10;
const MAX_FONT = 16;
const MIN_CHARS_TRUNCATED = 5; // меньше 5 символов — не усекаем, показываем «none»

/** Подбирает шрифт, при котором метка влезает целиком (или упирается в MIN_FONT) */
function pickFontSize(/** @type {{w:number,h:number}} */ cell, /** @type {string} */ label) {
    let fs = Math.round(Math.min(cell.w / 6, cell.h / 3.2));
    if (fs > MAX_FONT) fs = MAX_FONT;
    if (fs < MIN_FONT) fs = MIN_FONT;

    const availW = cell.w - LABEL_PADDING;
    while (fs > MIN_FONT && label.length * fs * CHAR_W_FACTOR > availW) {
        fs--;
    }
    return fs;
}

/** @typedef {'full'|'truncated'|'none'} LabelMode */
/** @typedef {{ mode: LabelMode, text: string }} LabelLayout */

/**
 * Решает: показать имя целиком, усечь или не показывать.
 * @returns {LabelLayout}
 */
function layoutLabel(
    /** @type {{w:number,h:number}} */ cell,
    /** @type {string} */ label,
    /** @type {number} */ fontSize
) {
    const availW = cell.w - LABEL_PADDING;
    const charW = fontSize * CHAR_W_FACTOR;
    const charsFit = Math.floor(availW / charW);

    if (label.length <= charsFit) {
        return { mode: 'full', text: label };
    }
    if (charsFit >= MIN_CHARS_TRUNCATED) {
        return { mode: 'truncated', text: label.slice(0, charsFit - 1) + '…' };
    }
    return { mode: 'none', text: '' };
}

// =====================================================================
// 3. РЕНДЕР ОДНОЙ ЯЧЕЙКИ
// =====================================================================

/**
 * @typedef {Object} CellCtx
 * @property {number} maxWeight
 * @property {number} pivot
 * @property {string} hrefPrefix
 * @property {string} countSuffix
 */

/**
 * @param {{name:string,weight:number,x:number,y:number,w:number,h:number}} cell
 * @param {CellCtx} ctx
 * @returns {string}
 */
function renderCell(cell, ctx) {
    const href = cell.href ?? `${ctx.hrefPrefix}${slugify_filename(cell.name)}.html`;

    const fillRgb = cell.isTail
        ? COLOR_GREY
        : pickFillRgb(cell.colorValue, ctx.maxColor, Math.max(1, Math.round(ctx.maxColor * ctx.pivotRatio)));
    const fillCss = rgbCss(fillRgb);
    const textFill = pickTextColor(fillRgb);

    const fontSize = pickFontSize(cell, cell.name);
    const label = layoutLabel(cell, cell.name, fontSize);
    const metricFontSize = Math.max(Math.round(fontSize * 0.8), 10);

    // --- Что пойдёт в метрики ---
    const sizeText = ctx.sizeFormat(cell.sizeValue);
    const colorText = ctx.colorFormat(cell.colorValue);

    const hasTailSub = cell.isTail && !!cell.tailCountText;
    const hasRoomStacked = !cell.isTail && cell.w >= 55 && cell.h >= 58;
    const hasRoomInline = !cell.isTail && cell.w >= 70 && cell.h >= 44;
    const hasRoomTail = hasTailSub && cell.w >= 55 && cell.h >= 44;

    const useStacked = hasRoomStacked && ctx.metricsLayout === 'stacked';
    const useInline = hasRoomInline && ctx.metricsLayout === 'inline';

    const x = cell.x,
        y = cell.y,
        w = cell.w,
        h = cell.h;
    const cx = x + w / 2;
    const cy = y + h / 2;

    let out = '';
    out += `  <a href="${href}" class="rect-link" title="${cell.name}">\n`;
    out +=
        `    <rect class="rect-box" x="${x}" y="${y}" width="${w - 3}" height="${h - 3}" ` +
        `rx="6" fill="${fillCss}" stroke="#ffffff" stroke-width="1.5"/>\n`;

    if (label.mode !== 'none') {
        const threeLine = useStacked; // имя + 2 метрики
        const twoLine = useInline || hasRoomTail; // имя + 1 строка

        const nameDy = threeLine ? '-1.3em' : twoLine ? '-0.7em' : '0';

        out +=
            `    <text class="heatmap-text" x="${cx}" y="${cy}" fill="${textFill}" ` +
            `font-size="${fontSize}" font-weight="700" text-anchor="middle" ` +
            `dominant-baseline="central"><title>${cell.name}</title>\n`;
        out += `      <tspan x="${cx}" dy="${nameDy}">${label.text}</tspan>\n`;

        if (threeLine) {
            out +=
                `      <tspan x="${cx}" dy="1.3em" font-weight="400" ` +
                `font-size="${metricFontSize}" opacity="0.92">${sizeText}</tspan>\n`;
            out +=
                `      <tspan x="${cx}" dy="1.3em" font-weight="400" ` +
                `font-size="${metricFontSize}" opacity="0.92">${colorText}</tspan>\n`;
        } else if (hasRoomTail) {
            // «176 терм.» серым под именем
            out +=
                `      <tspan x="${cx}" dy="1.4em" font-weight="400" ` +
                `font-size="${metricFontSize}" opacity="0.92">${cell.tailCountText}</tspan>\n`;
        } else if (useInline) {
            out +=
                `      <tspan x="${cx}" dy="1.4em" font-weight="400" ` +
                `font-size="${metricFontSize}" opacity="0.92">` +
                `${sizeText} / ${colorText}</tspan>\n`;
        }

        out += `    </text>\n`;
    }
    out += `  </a>\n`;
    return out;
}

// =====================================================================
// 4. SVG-КАРТА
// =====================================================================

/**
 * @param {Array<{name:string,weight:number,x:number,y:number,w:number,h:number}>} rects
 * @param {number} totalWidth
 * @param {number} totalHeight
 * @param {{ pivot?: number, hrefPrefix?: string, countSuffix?: string }} [options]
 */
function generateSvgHeatmap(rects, totalWidth, totalHeight, options = {}) {
    const {
        maxColor = 1,
        pivotRatio = 0.14,
        sizeFormat = v => String(v),
        colorFormat = v => String(v),
        metricsLayout = 'stacked',
        hrefPrefix = 'ru/contexts/',
    } = options;

    const filtered = rects.filter(r => Number.isFinite(r.sizeValue) && r.sizeValue > 0);

    /** @type {CellCtx} */
    const ctx = { maxColor, pivotRatio, sizeFormat, colorFormat, metricsLayout, hrefPrefix };

    let svg =
        `<svg viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="auto" ` +
        `style="border-radius: 8px; font-family: system-ui, -apple-system, sans-serif; ` +
        `user-select: none; overflow: visible;">\n`;
    svg += `  <style>
    .rect-box { transition: fill 0.2s ease, stroke 0.2s ease; }
    .rect-link:hover .rect-box { fill: #1a80b6 !important; stroke: #000000 !important; }
    .heatmap-text { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35)); text-rendering: geometricPrecision; }
  </style>\n\n`;

    for (const r of filtered) {
        svg += renderCell(r, ctx);
    }

    svg += `</svg>\n`;
    return svg;
}

// =====================================================================
// 5. TREEMAP
// =====================================================================

function computeTreemap(elements, width, height) {
    const scaledElements = elements
        .map(el => ({
            name: el.name,
            sizeValue: el.sizeValue ?? el.weight ?? 0,
            colorValue: el.colorValue ?? 0,
            isTail: el.isTail === true,
            href: el.href,
            tailCountText: el.tailCountText, // ← НОВОЕ
            value: Math.pow(el.sizeValue ?? el.weight ?? 0, 0.65),
        }))
        .filter(el => Number.isFinite(el.value) && el.value > 0);

    if (scaledElements.length === 0) return [];

    scaledElements.sort((a, b) => b.value - a.value);
    const totalValue = scaledElements.reduce((sum, el) => sum + el.value, 0);

    const totalArea = width * height;
    const MIN_AREA = totalArea * 0.0015;

    scaledElements.forEach(el => {
        el.area = (el.value / totalValue) * totalArea;
        el.area = Math.max(el.area, MIN_AREA);
    });

    const realSum = scaledElements.reduce((s, el) => s + el.area, 0);
    const k = totalArea / realSum;
    scaledElements.forEach(el => {
        el.area *= k;
    });

    const rects = [];
    let x = 0,
        y = 0;
    let w = width,
        h = height;
    let i = 0;

    while (i < scaledElements.length) {
        let row = [];
        const currentShortestSide = Math.min(w, h);

        while (i < scaledElements.length) {
            const nextElement = scaledElements[i];
            const testRow = [...row, nextElement];
            if (isWorstAspectRatio(testRow, currentShortestSide)) break;
            row.push(nextElement);
            i++;
        }

        const rowArea = row.reduce((sum, el) => sum + el.area, 0);
        const isHorizontal = w > h;

        if (isHorizontal) {
            const rowWidth = rowArea / h;
            let currentY = y;
            row.forEach(el => {
                const elHeight = el.area / rowWidth;
                rects.push({
                    name: el.name,
                    sizeValue: el.sizeValue,
                    colorValue: el.colorValue,
                    isTail: el.isTail,
                    href: el.href,
                    tailCountText: el.tailCountText,
                    x,
                    y: currentY,
                    w: rowWidth,
                    h: elHeight,
                });
                currentY += elHeight;
            });
            x += rowWidth;
            w -= rowWidth;
        } else {
            const rowHeight = rowArea / w;
            let currentX = x;
            row.forEach(el => {
                const elWidth = el.area / rowHeight;
                rects.push({
                    name: el.name,
                    sizeValue: el.sizeValue, // ← новое
                    colorValue: el.colorValue, // ← новое
                    isTail: el.isTail,
                    href: el.href,
                    tailCountText: el.tailCountText,
                    x: currentX,
                    y,
                    w: elWidth,
                    h: rowHeight,
                });
                currentX += elWidth;
            });
            y += rowHeight;
            h -= rowHeight;
        }
    }

    rects.forEach(r => {
        if (Math.abs(r.x + r.w - width) < 5) r.w = width - r.x;
        if (Math.abs(r.y + r.h - height) < 5) r.h = height - r.y;
        r.x = Math.round(r.x);
        r.y = Math.round(r.y);
        r.w = Math.max(Math.round(r.w), 1);
        r.h = Math.max(Math.round(r.h), 1);
    });

    return rects;
}

function isWorstAspectRatio(row, side) {
    if (row.length === 0) return true;
    const sumArea = row.reduce((sum, el) => sum + el.area, 0);
    if (sumArea === 0) return true;

    const maxArea = Math.max(...row.map(el => el.area));
    const minArea = Math.min(...row.map(el => el.area));
    const sideSq = side * side;

    const worstWithCurrent = Math.max(
        (sideSq * maxArea) / (sumArea * sumArea),
        (sumArea * sumArea) / (sideSq * minArea)
    );

    if (row.length === 1) return false;

    const prevRow = row.slice(0, -1);
    const prevSumArea = prevRow.reduce((sum, el) => sum + el.area, 0);
    const prevMaxArea = Math.max(...prevRow.map(el => el.area));
    const prevMinArea = Math.min(...prevRow.map(el => el.area));

    const worstBefore = Math.max(
        (sideSq * prevMaxArea) / (prevSumArea * prevSumArea),
        (prevSumArea * prevSumArea) / (sideSq * prevMinArea)
    );

    return worstWithCurrent > worstBefore;
}

// =====================================================================
// 6. ПУБЛИЧНЫЕ ФУНКЦИИ
// =====================================================================

/**
 * @param {Object} params
 * @param {string} params.lang
 * @param {string[]} params.sortedTerms
 * @param {ContextMap} params.contextMap
 * @param {number} [params.width]
 * @param {number} [params.height]
 * @param {number} [params.pivot]
 */
function generateMapContent({
    lang,
    sortedTerms,
    contextMap,
    width = 900,
    height = 450,
    tailMeta = null,
    sizeMetric = 'totalSize',
    colorMetric = 'rank',
    metricsLayout = 'stacked',
}) {
    const sizeSpec = resolveMetric(sizeMetric);
    const colorSpec = resolveMetric(colorMetric);

    const elements = sortedTerms.map(term => {
        const ctx = contextMap[term] || {};
        return {
            name: term,
            sizeValue: sizeSpec.valueOf(ctx),
            colorValue: colorSpec.valueOf(ctx),
        };
    });

    if (tailMeta) {
        elements.push({
            name: tailMeta.label,
            sizeValue: tailMeta.sizeDisplay,
            colorValue: tailMeta.colorDisplay,
            isTail: true,
            href: tailMeta.href,
            tailCountText: tailMeta.countText,
        });
    }

    elements.sort((a, b) => b.sizeValue - a.sizeValue);

    const rects = computeTreemap(elements, width, height);
    const maxColor = Math.max(...elements.filter(e => !e.isTail).map(e => e.colorValue), 1);

    const svgHtml = generateSvgHeatmap(rects, width, height, {
        maxColor,
        pivotRatio: colorSpec.pivotRatio,
        sizeFormat: sizeSpec.format,
        colorFormat: colorSpec.format,
        metricsLayout,
        hrefPrefix: `${lang}/contexts/`,
    });

    const legend = buildLegend(lang, sizeSpec, colorSpec);

    return (legend + '\n' + svgHtml).replace(/{/g, '&#123;').replace(/}/g, '&#125;');
}

function generateRankingContent({ sortedTerms, contextMap, rowHeight = 22, pivot = DEFAULT_PIVOT }) {
    const items = sortedTerms
        .map(t => ({ name: t, rank: contextMap[t]?.rank || 0, slug: slugify_filename(t) }))
        .filter(x => x.rank > 0)
        .sort((a, b) => b.rank - a.rank);

    const maxRank = items[0]?.rank || 1;
    const labelW = 260;
    const chartW = 640;
    const totalW = labelW + chartW + 60;
    const totalH = items.length * rowHeight + 20;

    let svg = `<svg viewBox="0 0 ${totalW} ${totalH}" width="100%" style="font-family: system-ui, sans-serif;">\n`;
    items.forEach((it, i) => {
        const y = i * rowHeight + 10;
        const w = (it.rank / maxRank) * chartW;
        const rgb = pickFillRgb(it.rank, maxRank, pivot);
        const fill = rgbCss(rgb);
        const textFill = pickTextColor(rgb);
        svg += `  <text x="${labelW - 8}" y="${y + 15}" text-anchor="end" font-size="13" fill="#333">${it.name}</text>\n`;
        svg += `  <a href="ru/contexts/${it.slug}.html">\n`;
        svg += `    <rect x="${labelW}" y="${y}" width="${w}" height="${rowHeight - 4}" rx="3" fill="${fill}"><title>${it.name} — ${it.rank}</title></rect>\n`;
        svg += `  </a>\n`;
        svg += `  <text x="${labelW + w + 6}" y="${y + 15}" font-size="12" fill="${textFill === '#ffffff' ? '#333' : '#666'}">${it.rank}</text>\n`;
    });
    svg += `</svg>\n`;
    return svg.replace(/{/g, '&#123;').replace(/}/g, '&#125;');
}

/**
 * CSS-градиент из тех же констант, что используются в ячейках.
 * Единственный источник правды для палитры.
 */
function buildGradientCss(stops = [0, 55, 100]) {
    const rgb = c => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    return (
        `linear-gradient(90deg,` +
        ` ${rgb(COLOR_LOW)} ${stops[0]}%,` +
        ` ${rgb(COLOR_MID)} ${stops[1]}%,` +
        ` ${rgb(COLOR_HIGH)} ${stops[2]}%)`
    );
}

/**
 * Легенда к heatmap-карте. Всё содержимое берётся из MetricSpec.
 * @param {string} lang
 * @param {import('./metrics').MetricSpec} sizeSpec
 * @param {import('./metrics').MetricSpec} colorSpec
 */
function buildLegend(lang, sizeSpec, colorSpec) {
    const lowLabel = pickLocalized(colorSpec.lowLabel, lang);
    const highLabel = pickLocalized(colorSpec.highLabel, lang);
    const sizeNote = pickLocalized(sizeSpec.label, lang);
    const colorNote = pickLocalized(colorSpec.label, lang);

    const gradient = buildGradientCss();

    return `<div class="heatmap-legend">
  <div class="heatmap-legend-row">
    <span class="heatmap-legend-edge">${lowLabel}</span>
    <span class="heatmap-legend-bar" style="background:${gradient}"></span>
    <span class="heatmap-legend-edge">${highLabel}</span>
  </div>
  <div class="heatmap-legend-notes">
    <span class="heatmap-legend-swatch heatmap-legend-swatch-size"></span>
    <span class="heatmap-legend-note">${sizeNote}</span>
    <span class="heatmap-legend-sep">·</span>
    <span class="heatmap-legend-swatch heatmap-legend-swatch-color" style="background:${gradient}"></span>
    <span class="heatmap-legend-note">${colorNote}</span>
  </div>
</div>`;
}

module.exports = { generateMapContent, generateRankingContent };
