// vscodeConfigGenerator.js

const { configDefinition } = require('../plugins/model/vscode.configdefinition.model');
/** @import {ConfigurationContributeResult} from "../plugins/model/vscode.contributes.model" */
/** @import {ConfigDefinition} from "../plugins/model/vscode.configfield.model" */

/**
 * Генерирует секцию contributes.configuration для package.json
 * @returns {ConfigurationContributeResult}
 */
function generateConfigurationContribute() {
    /** @type ConfigDefinition */
    const properties = {};
    const CONFIG_KEY = 'diplodoc-helper';
    const CONFIG_TITLE = 'Diplodoc Helper';

    for (const [key, def] of Object.entries(configDefinition)) {
        properties[`${CONFIG_KEY}.${key}`] = {
            type: def.type,
            default: def.default,
            description: def.description,
        };

        if (def.enum) properties[`${CONFIG_KEY}.${key}`].enum = def.enum;
        if (def.enumDescriptions) properties[`${CONFIG_KEY}.${key}`].enumDescriptions = def.enumDescriptions;
    }

    return {
        contributes: {
            configuration: {
                title: CONFIG_TITLE,
                properties: properties,
            },
        },
    };
}

module.exports = { generateConfigurationContribute };
