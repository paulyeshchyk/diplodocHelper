const fs = require('fs');
const path = require('path');

const FIGCAPTION_RE =
    /<figcaption\s+class="imageDescription"([^>]*?)\sid="([^"]+)"([^>]*?)>([\s\S]*?)<\/figcaption>/gi;
const IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Извлекает номер из подписи: "Рисунок 152. ..." -> 152
 * @param {string} caption
 * @returns {number|null}
 */
function extractFigureNumber(caption) {
    const m = caption.match(/(?:Рисунок|Figure|Fig\.?|Рис\.?)\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
}

/**
 * @param {string} fullPath
 * @param {string} langDir
 * @returns {import('./figures.model').FigureInfo[]}
 */
function extractFiguresFromFile(fullPath, langDir) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const result = [];

    // 1. Все markdown-картинки с позициями
    const images = [];
    const imgRe = new RegExp(IMG_RE.source, 'g');
    let m;
    while ((m = imgRe.exec(content)) !== null) {
        images.push({ pos: m.index, alt: m[1], path: m[2] });
    }

    // 2. Все figcaption.imageDescription с id
    const relToLang = path.relative(langDir, fullPath).replace(/\\/g, '/');
    const capRe = new RegExp(FIGCAPTION_RE.source, 'gi');
    while ((m = capRe.exec(content)) !== null) {
        const id = m[2];
        const caption = m[4].replace(/<[^>]+>/g, '').trim(); // убираем <b>, <i> и пр.
        const pos = m.index;

        // ближайшая картинка слева
        let bestImg = null;
        let bestDist = Infinity;
        for (const img of images) {
            if (img.pos < pos && pos - img.pos < bestDist) {
                bestDist = pos - img.pos;
                bestImg = img;
            }
        }

        result.push({
            id,
            caption,
            imagePath: bestImg ? bestImg.path : null,
            imageAlt: bestImg ? bestImg.alt : caption,
            sourcePath: relToLang,
            figureNumber: extractFigureNumber(caption),
        });
    }

    return result;
}

module.exports = { extractFiguresFromFile, extractFigureNumber };