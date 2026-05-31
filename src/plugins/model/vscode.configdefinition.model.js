// config.js

/** @import {ConfigDefinition} from "./vscode.configfield.model" */

/** @type {ConfigDefinition} */
const configDefinition = {
    figurePrefix: {
        type: 'string',
        default: 'Рисунок',
        description: "Префикс для подписей рисунков (например, 'Figure' для английского)",
    },
    figureReferencePrefix: {
        type: 'string',
        default: 'see ',
        description: "Префикс для ссылок (напр 'см.')",
    },
    maxDepth: {
        type: 'number',
        default: 5,
        description: 'Максимальная глубина поиска разделов',
    },
    autoReindex: {
        type: 'boolean',
        default: true,
        description: 'Автоматически обновлять индексы при изменении структуры',
    },
    defaultLanguage: {
        type: 'string',
        default: 'ru',
        enum: ['ru', 'en'],
        enumDescriptions: ['Русский', 'English'],
        description: 'Язык интерфейса по умолчанию',
    },
    outputFolder: {
        type: 'string',
        default: 'docs',
        description: 'Папка для сгенерированных файлов (относительно корня рабочей области)',
    },
};

module.exports = {
    configDefinition,
};
