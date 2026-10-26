// @ts-nocheck

const fs = require('fs');
const path = require('path');

function encodePath(relPath) {
    return relPath
        .split('/')
        .map(seg => (seg === '..' || seg === '.' || seg === '' ? seg : encodeURIComponent(seg)))
        .join('/');
}

/** Возвращает src превью (thumbnail) и ссылку на полноразмерное изображение */
function resolveImageSources(fig, lang) {
    const fullSrc = buildImgSrc(fig, lang);
    if (!fullSrc) return { previewSrc: null, fullSrc: null };

    let previewSrc = fullSrc;
    if (fig.thumbPath) {
        previewSrc = encodePath(fig.thumbPath);
    }

    return { previewSrc, fullSrc };
}

/** Абсолютный путь от корня сайта: /<lang>/<sourcePath с .html>#<id> */
function buildSourceHref(lang, sourcePath, figId) {
    let p = String(sourcePath).replace(/^\/+/, '');
    p = p.replace(/\.md$/i, '.html');
    return encodePath(`/${lang}/${p}`) + `#${figId}`;
}

/** Путь к картинке относительно docs/<lang>/figures/index.md */
function resolveImagePath(fig, lang) {
    if (!fig.imagePath) return null;
    const raw = String(fig.imagePath).trim().replace(/^<|>$/g, '');
    if (!raw) return null;
    if (/^(https?:|data:|\/\/)/i.test(raw)) return raw;
    if (raw.startsWith('/')) return raw;

    const sourceDir = path
        .dirname(fig.sourcePath)
        .replace(/\\/g, '/')
        .replace(/^\/+|\/+$/g, '');
    const imgRel = raw.replace(/^\.\//, '').replace(/\\/g, '/');

    const fullPath = sourceDir === '.' || sourceDir === '' ? imgRel : `${sourceDir}/${imgRel}`;

    return `/${lang}/${fullPath}`;
}

function stripFigurePrefix(caption) {
    return String(caption)
        .replace(/^(Рисунок|Figure|Fig\.?|Рис\.?)\s*\d+\.?\s*/i, '')
        .trim();
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Возвращает src для <img data-src>, либо null */
function buildImgSrc(fig, lang) {
    const imgSrc = resolveImagePath(fig, lang);
    if (!imgSrc) return null;
    if (imgSrc.startsWith('http') || imgSrc.startsWith('data:')) return imgSrc;
    return encodePath(imgSrc);
}

function renderTableRow(fig, idx, lang) {
    const cleanCaption = stripFigurePrefix(fig.caption);
    const sourceLink = buildSourceHref(lang, fig.sourcePath, fig.id);
    const titleCell = `<a href="${sourceLink}">${escapeHtml(cleanCaption)}</a>`;

    const { previewSrc, fullSrc } = resolveImageSources(fig, lang);
    const previewCell = previewSrc
        ? `<img data-src="${escapeHtml(previewSrc)}" data-full-src="${escapeHtml(fullSrc)}" alt="${escapeHtml(cleanCaption)}" ` +
          `class="js-lightbox-trigger fig-preview-img" loading="lazy" />`
        : `<span class="fig-preview-empty">—</span>`;

    return (
        `<tr>\n` +
        `  <td class="fig-num">${idx}</td>\n` +
        `  <td class="fig-title">${titleCell}</td>\n` +
        `  <td class="fig-preview">${previewCell}</td>\n` +
        `</tr>`
    );
}

function renderGridCard(fig, idx, lang) {
    const cleanCaption = stripFigurePrefix(fig.caption);
    const sourceLink = buildSourceHref(lang, fig.sourcePath, fig.id);

    const { previewSrc, fullSrc } = resolveImageSources(fig, lang);
    const previewInner = previewSrc
        ? `<img data-src="${escapeHtml(previewSrc)}" data-full-src="${escapeHtml(fullSrc)}" alt="${escapeHtml(cleanCaption)}" ` +
          `class="js-lightbox-trigger fig-grid-img" loading="lazy" />`
        : `<span class="fig-grid-placeholder">—</span>`;

    return (
        `<div class="fig-grid-card">\n` +
        `  <div class="fig-grid-preview">${previewInner}</div>\n` +
        `  <div class="fig-grid-meta">\n` +
        `    <span class="fig-grid-num">${idx}</span>\n` +
        `    <a class="fig-grid-title" href="${sourceLink}">${escapeHtml(cleanCaption)}</a>\n` +
        `  </div>\n` +
        `</div>`
    );
}

function sortFigures(figures) {
    return [...figures].sort((a, b) => {
        if (a.figureNumber == null && b.figureNumber == null) {
            return a.caption.localeCompare(b.caption, 'ru');
        }
        if (a.figureNumber == null) return 1;
        if (b.figureNumber == null) return -1;
        return a.figureNumber - b.figureNumber;
    });
}

function writeFigureList(outputDir, figures, lang) {
    const isRu = lang === 'ru';
    const title = isRu ? 'Перечень иллюстраций' : 'List of figures';
    const colNo = isRu ? '№ п/п' : 'No.';
    const colName = isRu ? 'Название иллюстрации' : 'Figure';
    const colPreview = isRu ? 'Предпросмотр' : 'Preview';
    const btnList = isRu ? 'Список' : 'List';
    const btnGrid = isRu ? 'Сетка' : 'Grid';

    const sorted = sortFigures(figures);

    const tableRows = sorted.map((f, i) => renderTableRow(f, i + 1, lang)).join('\n');
    const tableHtml =
        `<table class="figures-table">\n` +
        `<thead>\n<tr>\n` +
        `  <th class="fig-num">${colNo}</th>\n` +
        `  <th class="fig-title">${colName}</th>\n` +
        `  <th class="fig-preview">${colPreview}</th>\n` +
        `</tr>\n</thead>\n<tbody>\n` +
        tableRows +
        `\n</tbody>\n</table>`;

    const gridCards = sorted.map((f, i) => renderGridCard(f, i + 1, lang)).join('\n');
    const gridHtml = `<div class="figures-grid">\n${gridCards}\n</div>`;

    const switcher =
        `<div class="figures-view-switch" role="tablist">\n` +
        `  <button type="button" data-figures-view="list" aria-pressed="true">${btnList}</button>\n` +
        `  <button type="button" data-figures-view="grid" aria-pressed="false">${btnGrid}</button>\n` +
        `</div>`;

    const container =
        `<div class="figures-container" data-view="list">\n` + tableHtml + '\n' + gridHtml + '\n' + `</div>`;

    const md = `---\ntitle: ${title}\nsectionType: Page\n---\n\n` + `# ${title}\n\n${switcher}\n\n${container}\n`;

    fs.writeFileSync(path.join(outputDir, 'index.md'), md, 'utf8');
    fs.writeFileSync(path.join(outputDir, 'toc.yaml'), `title: ${title}\nhref: index.md\n`, 'utf8');
    fs.writeFileSync(path.join(outputDir, 'index.yaml'), `title: ${title}\nhref: index.html\n`, 'utf8');
}

module.exports = { writeFigureList };
