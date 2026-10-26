// @ts-nocheck
// plugins/roadMap/builders/controls.builder.js

/**
 * Генерирует стандартный блок кнопок Pan/Zoom
 */
function buildGanttControls() {
    return `
<div class="gantt-toolbar">
  <button type="button" class="gantt-toggle-btn js-toggle-pan" title="Перемещение мышью">
    🖐️ Перемещение (Pan)
  </button>
  <button type="button" class="gantt-toggle-btn js-toggle-zoom" title="Масштабирование колесом / Скролл страницы">
    🔍 Зум (Zoom)
  </button>
</div>`.trim();
}

/**
 * Оборачивает готовый SVG (для PlantUML)
 */
function wrapSvgContainer(svgContent, options = {}) {
    const { cssContent = '', legend = '' } = options;
    const styleBlock = cssContent ? `<style>\n${cssContent}\n</style>\n` : '';

    return `
${styleBlock}<div class="gantt-wrapper">
  ${buildGanttControls()}

  <div class="gantt-raw-container">
    ${svgContent}
  </div>
</div>

${legend}`.trim();
}

/**
 * Оборачивает Mermaid (Markdown + HTML контейнер)
 */
function wrapMermaidContainer(mermaidScript, options = {}) {
    const { cssContent = '', mappingJson = null } = options;

    const styleBlock = cssContent ? `<style>\n${cssContent}\n</style>\n` : '';
    const mappingBlock = mappingJson
        ? `<div class="js-gantt-mapping" data-mapping='${mappingJson}' style="display:none;"></div>`
        : '';

    return `
${styleBlock}
<div class="gantt-wrapper">
  ${buildGanttControls()}

${mermaidScript}

  ${mappingBlock}
</div>`.trim();
}

module.exports = {
    buildGanttControls,
    wrapSvgContainer,
    wrapMermaidContainer,
};
