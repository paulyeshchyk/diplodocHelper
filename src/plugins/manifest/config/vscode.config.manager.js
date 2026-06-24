// DiplodocConfigManager.js

const vscode = require('vscode');
const { DiplodocConfigFromJson } = require('./diplodoc.config');
const constants = require('../constants');

/** @import { DiplodocConfig } from './diplodoc.config.model' */

const CONFIG_KEY = constants.CONFIG_KEY;

/** @type {DiplodocConfig | null} */
let instance = null;

/**
 * Возвращает экземпляр конфигурации (ленивая инициализация)
 * @returns {DiplodocConfig}
 */
function DiplodocConfigSharedInstance() {
    if (!instance) {
        instance = createConfigInVsCode(CONFIG_KEY);
    }
    return instance;
}

/**
 * Читает настройки расширения из VS Code
 * @param {string} CONFIG_KEY
 * @returns {DiplodocConfig}
 */
function DiplodocConfigFromWorkspace(CONFIG_KEY) {
    const config = vscode.workspace.getConfiguration(CONFIG_KEY);

    let result = {
        figureCaptionPrefix: config.get('figureCaptionPrefix', 'Рисунок'),
        figureReferenceCaptionPrefix: config.get('figureReferenceCaptionPrefix', 'рис.'),
        figureReferencePrefix: config.get('figureReferencePrefix', 'см. '),
        defaultLanguage: config.get('defaultLanguage', 'ru'),
        usePollingForContext: config.get('usePollingForContext', true),
        contextPollingInterval: config.get('contextPollingInterval', 1800),
    };
    return result;
}

/**
 * Обновить кэш конфигурации при изменении настроек
 */
function setupDiplodocConfigChangeWatcher() {
    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration(CONFIG_KEY)) {
            instance = null;
            console.log('Конфигурация Diplodoc Helper обновлена');
        }
    });
}

/**
 * Создаёт конфиг из настроек VS Code
 * @param {string} CONFIG_KEY
 * @returns {DiplodocConfig}
 */
function createConfigInVsCode(CONFIG_KEY) {
    const rawConfig = vscode.workspace.getConfiguration(CONFIG_KEY);
    return DiplodocConfigFromJson(rawConfig);
}

module.exports = {
    createConfigInVsCode,
    DiplodocConfigSharedInstance,
    setupDiplodocConfigChangeWatcher,
    DiplodocConfigFromWorkspace,
};
