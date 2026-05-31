// DiplodocConfigManager.js

// @ts-nocheck

/** @import { DiplodocConfig } from '../plugins/model/vscode.diplodocconfig.model' */

const vscode = require('vscode');
const { configDefinition } = require('../plugins/model/vscode.configdefinition.model');

const CONFIG_KEY = 'diplodoc-helper';

/** @type {DiplodocConfig | null} */
let instance = null;

/**
 * Возвращает экземпляр конфигурации (ленивая инициализация)
 * @returns {DiplodocConfig}
 */
function readConfig() {
    if (!instance) {
        instance = createConfigInVsCode();
    }
    return instance;
}

/**
 * Обновить конфиг при изменении настроек
 */
function setupConfigWatcher() {
    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration(CONFIG_KEY)) {
            instance = null; // сбрасываем кэш
            console.log('Конфигурация Diplodoc Helper обновлена');
        }
    });
}

/**
 * Возвращает обычный объект с конфигурацией
 * @returns {DiplodocConfig}
 */
function buildDefaultDiplodocConfig() {
    const rawConfig = vscode.workspace.getConfiguration(CONFIG_KEY);

    const result = DiplodocConfigEmpty();

    for (const key of Object.keys(configDefinition)) {
        result[key] = rawConfig.get(key, configDefinition[key].default);
    }

    return result;
}

/**
 * Возвращает Proxy — самый удобный вариант
 * @returns {DiplodocConfig}
 */
function createConfigInVsCode() {
    const rawConfig = vscode.workspace.getConfiguration(CONFIG_KEY);

    let proxy = new Proxy(
        {},
        {
            get(_, prop) {
                if (prop in configDefinition) {
                    return rawConfig.get(prop);
                }
                return undefined;
            },
        }
    );
    return proxy;
}

/**
 *
 * @returns {DiplodocConfig}
 */
function DiplodocConfigEmpty() {
    return {
        figurePrefix: '',
        figureReferencePrefix: '',
        maxDepth: 0,
        autoReindex: false,
        defaultLanguage: 'en',
        outputFolder: '',
    };
}

module.exports = {
    readConfig,
    setupConfigWatcher,
    buildDefaultDiplodocConfig,
    createConfigInVsCode,
};
