const path = require('path');
const { injectGostsTable } = require('./gosts.injector');

const args = process.argv.slice(2);
const langDirIndex = args.indexOf('--langDir');
const targetHtmlIndex = args.indexOf('--targetHtml');

if (langDirIndex !== -1 && targetHtmlIndex !== -1) {
    const langDir = args[langDirIndex + 1];
    const targetHtml = args[targetHtmlIndex + 1];
    // Определяем язык из последнего сегмента langDir (ru или en)
    const lang = path.basename(path.resolve(langDir));
    injectGostsTable({ langDir, targetHtml, lang });
}