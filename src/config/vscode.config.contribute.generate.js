const fs = require('fs');
const path = require('path');
const { ConfigParserBase } = require('./parser/config.parser.base');

/**
 * Генерирует contributes.configuration на основе переданного парсера
 * @param {Object} config
 * @param {string} config.modelPath - путь к файлу модели (относительно текущего файла)
 * @param {string} config.typeDefName - имя типа / интерфейса
 * @param {string} config.settingPrefix - префикс настроек
 * @param {string} [config.title="Diplodoc Helper"] - заголовок секции
 * @param {ConfigParserBase} config.parser - экземпляр парсера (должен иметь метод parse)
 * @returns {{ contributes: { configuration: Object } }}
 */
function generateConfigurationContribute(config) {
    const { modelPath, typeDefName, settingPrefix, title = 'Diplodoc Helper', parser } = config;

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

module.exports = { generateConfigurationContribute };
