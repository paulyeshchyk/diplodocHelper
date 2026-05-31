// DiplodocConfigManager.js

const vscode = require('vscode');
const { DiplodocConfigFromJson } = require('../plugins/utils/diplodoc.config');

/** @import { DiplodocConfig } from '../plugins/model/diplodocconfig.model' */

const CONFIG_KEY = 'diplodoc-helper';

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
 * Читает настройки расширения из VS Code и возвращает только
 * необходимые для реиндексатора параметры.
 * @param {string | undefined} CONFIG_KEY
 * @returns {DiplodocConfig}
 */
function DiplodocConfigFromWorkspace(CONFIG_KEY) {
    const config = vscode.workspace.getConfiguration(CONFIG_KEY);

    return {
        defaultLanguage: config.get('defaultLanguage', 'ru'),
        figureCaptionPrefix: config.get('figureCaptionPrefix', 'Рисунок'),
        figureReferencePrefix: config.get('figureReferencePrefix', 'см. '),
    };
}

/**
 * Обновить конфиг при изменении настроек
 */
function setupDiplodocConfigChangeWatcher() {
    vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration(CONFIG_KEY)) {
            instance = null; // сбрасываем кэш
            console.log('Конфигурация Diplodoc Helper обновлена');
        }
    });
}

/**
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
