// @ts-nocheck

// plugins/helptags/helptags.collector.js

const fs = require('fs');
const path = require('path');
const { extractHelptagTagValue } = require('./helptags.extractor');

/**
 * Собирает все helptags из директории языка
 * @param {string} langDir
 * @returns {Object}
 */
function walkMdFilesGetHelptags(langDir) {
    const helptagMap = {};

    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.lstatSync(fullPath);

            if (stat.isDirectory()) {
                // Исключаем собственную папку helptags, чтобы избежать зацикливания
                if (file !== 'helptags' && file !== 'contexts') {
                    walk(fullPath);
                }
            } else if (file.endsWith('.md')) {
                extractHelptagTagValue(fullPath, langDir, helptagMap);
            }
        }
    }

    walk(langDir);
    return helptagMap;
}

module.exports = { walkMdFilesGetHelptags };
