const fs = require('fs');
const path = require('path');

/**
 * @param {string} outputDir
 * @param {any} entries
 * @param {string} lang
 */
function writeGostsIndex(outputDir, entries, lang) {
    const isRu = lang === 'ru';
    const title = isRu ? 'Перечень стандартов' : 'List of standards';

    const md = `---
title: ${title}
sectionType: Page
---

# ${title}

<div id="gosts-container">Загрузка таблицы...</div>
`;

    fs.writeFileSync(path.join(outputDir, 'index.md'), md, 'utf8');
    fs.writeFileSync(path.join(outputDir, 'toc.yaml'), `title: ${title}\nhref: index.md\n`, 'utf8');
    fs.writeFileSync(path.join(outputDir, 'index.yaml'), `title: ${title}\nhref: index.html\n`, 'utf8');
}

module.exports = { writeGostsIndex };