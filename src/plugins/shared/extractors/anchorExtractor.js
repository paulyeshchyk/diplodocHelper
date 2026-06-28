const { slugify_diplodoc_reference } = require('../../utils/encoding.slugify');

const fs = require('fs').promises;

/**
 * Извлекает якоря из Markdown-файла (заголовки, {#якоря}, HTML id)
 * @param {string} filePath – абсолютный путь к .md файлу
 * @returns {Promise<Array<{label: string, anchor: string}>>}
 */
async function extractAnchorsFromMdFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const anchors = [];
        const seenAnchors = new Set();

        // 1. Заголовки Markdown (с учётом возможных пробелов в начале)
        const headingRegex = /^\s*(#{1,6})\s+(.+?)(?:\s*\{#([^}]+)\})?\s*$/gm;
        let match;
        while ((match = headingRegex.exec(content)) !== null) {
            const level = match[1].length;
            let title = match[2].trim();
            let explicitAnchor = match[3]?.trim();

            let anchor;
            if (explicitAnchor) {
                anchor = explicitAnchor;
            } else {
                anchor = slugify_diplodoc_reference(title);
            }

            if (!seenAnchors.has(anchor)) {
                seenAnchors.add(anchor);
                anchors.push({
                    label: `${'#'.repeat(level)} ${title}`,
                    anchor: anchor,
                });
            }
        }

        // 2. HTML-атрибуты id (регистронезависимо, с кавычками или без)
        const idRegex = /\bid\s*=\s*(["']?)([^"'\s>]+)\1/gi;
        let idMatch;
        while ((idMatch = idRegex.exec(content)) !== null) {
            const idValue = idMatch[2];
            if (!seenAnchors.has(idValue)) {
                seenAnchors.add(idValue);
                anchors.push({
                    label: `id: ${idValue}`,
                    anchor: idValue,
                });
            }
        }

        // 3. Дополнительно: якоря, определённые через <a name="value"> (legacy)
        const nameRegex = /<a\s+name\s*=\s*(["']?)([^"'\s>]+)\1/gi;
        let nameMatch;
        while ((nameMatch = nameRegex.exec(content)) !== null) {
            const nameValue = nameMatch[2];
            if (!seenAnchors.has(nameValue)) {
                seenAnchors.add(nameValue);
                anchors.push({
                    label: `name: ${nameValue}`,
                    anchor: nameValue,
                });
            }
        }

        return anchors;
    } catch {
        return [];
    }
}

module.exports = { extractAnchorsFromMdFile };
