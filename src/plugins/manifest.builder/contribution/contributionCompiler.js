const fs = require('fs');
const path = require('path');
/**
 * Генерирует contributes.configuration на основе переданного парсера
 * @param {Object} config
 * @param {string} config.modelPath - путь к файлу модели (относительно текущего файла)
 * @param {string} config.typeDefName - имя типа / интерфейса
 * @param {string} config.settingPrefix - префикс настроек
 * @param {string} config.title - заголовок секции
 * @param {import('../config/config.parser.base').ConfigParserBase} config.parser - экземпляр парсера (должен иметь метод parse)
 * @returns {{ contributes: { configuration: Object } }}
 */

// ==============
function compileContribution(config) {
    const { modelPath, typeDefName, settingPrefix, title, parser } = config;

    const fullModelPath = path.resolve(__dirname, modelPath);
    const source = fs.readFileSync(fullModelPath, 'utf8');

    // Внедряем префикс в парсер (если он не установлен)
    if (parser.settingPrefix !== settingPrefix) {
        parser.settingPrefix = settingPrefix;
    }

    const properties = parser.parse(source, typeDefName);

    return {
        contributes: {
            configuration: {
                title,
                properties,
            },
        },
    };
}
exports.compileContribution = compileContribution;
