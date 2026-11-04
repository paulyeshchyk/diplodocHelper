const { Html_Classify_File } = require('./html/Html_Classify_File.ts');

/**
 * @deprecated Импортируйте `Html_Classify_File` напрямую.
 * Regression: 00.4.1#01..#08, #09.
 */
const isHtmlFile = Html_Classify_File.isHtmlFile;
const isRootIndex = Html_Classify_File.isRootIndex;

module.exports = { isHtmlFile, isRootIndex };