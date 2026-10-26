// @ts-nocheck
// plugins/roadMap/post-build.js

const DiagramEngine = require('./enums/DiagramEngine');
const { patchPlantUml } = require('./patchers/plantuml.patcher');
const { patchMermaid } = require('./patchers/mermaid.patcher');

const CURRENT_ENGINE = DiagramEngine.PLANTUML;

/**
 * Основная функция пост-инъекции (вызывается после сборки Diplodoc)
 * @param {string|Object} options Путь к папке билда или объект конфигурации
 * @param {string} [options.buildDir] Путь к директории с собранным HTML
 * @param {string} [options.engine] Выбранный движок диаграмм
 */
async function runGeneration(options) {
    const buildDir = typeof options === 'string' ? options : options?.buildDir || './build';
    const engine = (typeof options === 'object' && options.engine) || CURRENT_ENGINE;

    switch (engine) {
        case DiagramEngine.PLANTUML:
            await patchPlantUml(buildDir);
            break;

        case DiagramEngine.MERMAID:
            await patchMermaid(buildDir);
            break;

        default:
            console.warn(`[Gantt Post-Build] Неизвестный engine: ${engine}. Используем PlantUML.`);
            await patchPlantUml(buildDir);
            break;
    }
}

module.exports = {
    runGeneration,
    generateGanttFixScroll: runGeneration,
};
