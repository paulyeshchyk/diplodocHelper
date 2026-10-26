/**
 * Единый контракт для Mermaid SVG (так как Mermaid рендерится в SVG на клиенте)
 */
async function buildMermaidSvg() {
  return {
    svgContent: null,
    isClientRendered: true,
  };
}

module.exports = {
  buildMermaidSvg,
};