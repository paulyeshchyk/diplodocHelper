/** @import {ConfigDefinition} from "./vscode.configfield.model" */

/** @type {ConfigDefinition} */
const configDefinition = {
    figureCaptionPrefix: {
        type: 'string',
        default: '%extension.settings.figureCaptionPrefix.default%',
        description: '%extension.settings.figureCaptionPrefix.description%',
    },
    figureReferencePrefix: {
        type: 'string',
        default: '%extension.settings.figureReferencePrefix.default%',
        description: '%extension.settings.figureReferencePrefix.description%',
    },
    defaultLanguage: {
        type: 'string',
        default: 'ru',
        enum: ['ru', 'en'],
        enumDescriptions: ['Русский', 'English'],
        description: '%extension.settings.defaultLanguage.description%',
    },
};

module.exports = {
    configDefinition,
};
