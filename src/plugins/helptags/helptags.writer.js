// plugins/helptags/helptags.writer.js

const fs = require('fs');
const path = require('path');

/**
 * @param {string} outputDir
 * @param {string[]} sortedTags
 * @param {Record<string, {title: string; href:string;pages:{title: string; href:string}[]}>} helptagMap
 * @param {string} lang
 * @param {string} title
 */
function writeHelptagsIndex(outputDir, sortedTags, helptagMap, lang, title) {
    let mdContent = ['---', `title: ${title}`, `sectionType: Page`, '---', '', `# ${title}`, ''].join('\n');
    let currentLetter = '';

    for (const tag of sortedTags) {
        const firstLetter = tag.charAt(0).toUpperCase();
        const pages = helptagMap[tag].pages;

        // Алфавитные заголовки (A, B, C...)
        if (firstLetter !== currentLetter) {
            if (currentLetter !== '') mdContent += '\n';
            mdContent += `\n## ${firstLetter}\n`;
            currentLetter = firstLetter;
        }

        // Унифицированный вывод: тег ВСЕГДА текст, страницы ВСЕГДА вложенным списком
        mdContent += `* **${tag}**\n`;
        pages.forEach(p => {
            mdContent += `  * [${p.title}](../${p.href})\n`;
        });
    }

    fs.writeFileSync(path.join(outputDir, 'index.md'), mdContent.trim() + '\n', 'utf8');

    // Файлы навигации Diplodoc
    fs.writeFileSync(path.join(outputDir, 'toc.yaml'), `title: ${title}\nhref: index.md\n`, 'utf8');
    fs.writeFileSync(path.join(outputDir, 'index.yaml'), `title: ${title}\nhref: index.html\n`, 'utf8');
}

module.exports = { writeHelptagsIndex };
