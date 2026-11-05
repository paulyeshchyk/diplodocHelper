// @ts-nocheck
'use strict';

const fs   = require('fs');
const path = require('path');
const { walk }       = require('../../utils/walk');
const { isHtmlFile } = require('../../utils/html.utils');

const STYLE_MARKER  = 'dl-feature-map-style';
const CLIENT_MARKER = 'dl-feature-map-client';

function runGeneration(buildDir) {
  if (!fs.existsSync(buildDir)) {
    console.error(`❌ [feature-map] build dir not found: ${buildDir}`);
    return { success: [], failed: [buildDir] };
  }

  const css = fs.readFileSync(path.join(__dirname, 'feature-map.css'),       'utf8');
  const js  = fs.readFileSync(path.join(__dirname, 'feature-map.client.js'), 'utf8');

  const styleTag  = `<style id="${STYLE_MARKER}">\n${css}\n</style>\n`;
  const clientTag = `<script id="${CLIENT_MARKER}">\n${js}\n</script>\n`;

  const results = { success: [], failed: [] };

  walk(buildDir, (p) => isHtmlFile(p), (htmlPath) => {
    try {
      let html = fs.readFileSync(htmlPath, 'utf8');
      if (!html.includes('data-feature-map')) return;

      const before = html;
      if (!html.includes(`id="${STYLE_MARKER}"`)) {
        html = html.replace('</head>', styleTag + '</head>');
      }
      if (!html.includes(`id="${CLIENT_MARKER}"`)) {
        html = html.replace('</body>', clientTag + '</body>');
      }
      if (html !== before) {
        fs.writeFileSync(htmlPath, html, 'utf8');
        results.success.push(htmlPath);
      }
    } catch (e) {
      console.error(`❌ [feature-map] ${htmlPath}:`, e.message || e);
      results.failed.push(htmlPath);
    }
  });

  console.log(`[feature-map] CSS+JS инжектированы в ${results.success.length} HTML, ошибок: ${results.failed.length}`);
  return results;
}

module.exports = { runGeneration };