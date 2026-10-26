// @ts-nocheck
// plugins/roadMap/builders/mermaid.builder.js

const { generateMermaidScript } = require('./mermaid.script.builder');
const { wrapMermaidContainer } = require('./controls.builder');

async function buildMermaid(data, lang, roadmapCss = '') {
    try {
        const { script, mapping } = generateMermaidScript(data, lang, {
            useShortSection: true,
            showHeaderTask: true,
            sortDirection: 'asc',
            useShortLabels: false,
        });

        const mappingJson = Object.keys(mapping).length > 0 ? JSON.stringify(mapping) : null;

        // Использование безопасной маркдаун-обертки
        return wrapMermaidContainer(script, {
            cssContent: roadmapCss,
            mappingJson: mappingJson,
        });
    } catch (error) {
        console.error(`❌ [${lang}] Сбой генерации Mermaid диаграммы:`, error.message);
        return '*Не удалось сгенерировать диаграмму Mermaid.*';
    }
}

module.exports = {
    buildMermaid,
};
