const fs = require('fs');
const path = require('path');
const { walk } = require('../utils/walk');
const { isHtmlFile } = require('../utils/html.utils');
const CONFIG = require('./comments.config');

const CLIENT_MARKER = 'dl-comments-client';
const STYLE_MARKER = 'dl-comments-style';
const LANGS = new Set(['ru', 'en']);

function buildClientBundle() {
  const dir = path.join(__dirname, 'client');
  if (!fs.existsSync(dir)) {
    console.warn('[comments] client/ directory not found');
    return '';
  }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  if (!files.length) { console.warn('[comments] no .js files in client/'); return ''; }

  const parts = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    parts.push(`// ======== client/${f} ========`);
    parts.push(content);
    parts.push('');
  }
  console.log(`[comments] client bundle: ${files.length} files (${files.join(', ')})`);
  return `(function () {\n'use strict';\n\n${parts.join('\n')}\n})();`;
}

function buildTemplatesHtml() {
  const dir = path.join(__dirname, 'templates');
  if (!fs.existsSync(dir)) return '';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
  if (!files.length) return '';
  const parts = [];
  for (const f of files) {
    const name = f.replace(/\.html$/, '');
    const content = fs.readFileSync(path.join(dir, f), 'utf8').trim();
    parts.push(`<script type="text/template" id="dl-tpl-${name}">${content}</script>`);
  }
  console.log(`[comments] templates: ${files.length} (${files.join(', ')})`);
  return parts.join('\n') + '\n';
}

function pickLang(buildDir, htmlPath) {
  const rel = path.relative(buildDir, htmlPath).replace(/\\/g, '/');
  const first = rel.split('/')[0];
  return LANGS.has(first) ? first : 'ru';
}

function injectIntoHtml(html, lang) {
  const hasClient = html.includes(`id="${CLIENT_MARKER}"`);
  const hasTemplates = html.includes('id="dl-tpl-dialog"');

  if (hasClient && hasTemplates) return html;
  if (hasClient && !hasTemplates) {
    const t = buildTemplatesHtml();
    if (!t || !html.includes('</body>')) return html;
    return html.replace('</body>', `${t}</body>`);
  }

  const cssPath = path.join(__dirname, 'comments.css');
  if (!fs.existsSync(cssPath)) return html;
  const css = fs.readFileSync(cssPath, 'utf8');
  const client = buildClientBundle();
  if (!client) return html;
  const templatesHtml = buildTemplatesHtml();

  const cfgJson = JSON.stringify({
    lang,
    apiBase: CONFIG.apiBase,
    ui: CONFIG.ui[lang] || CONFIG.ui.ru,
  });

  let out = html;
  if (!out.includes(`id="${STYLE_MARKER}"`)) {
    out = out.replace('</head>', `<style id="${STYLE_MARKER}">\n${css}\n</style>\n</head>`);
  }
  const bundle = `<script id="${CLIENT_MARKER}">\nwindow.__DL_COMMENTS_CFG__ = ${cfgJson};\n${client}\n</script>\n`;
  const injection = templatesHtml + bundle;
  out = out.includes('</body>') ? out.replace('</body>', `${injection}</body>`) : out + injection;
  return out;
}

function runGeneration(buildDir) {
  const results = { success: [], failed: [] };
  if (!fs.existsSync(buildDir)) {
    console.error(`❌ [comments] build dir not found: ${buildDir}`);
    return results;
  }
  walk(buildDir, (p) => isHtmlFile(p), (htmlPath) => {
    try {
      const html = fs.readFileSync(htmlPath, 'utf8');
      const lang = pickLang(buildDir, htmlPath);
      const next = injectIntoHtml(html, lang);
      if (next !== html) {
        fs.writeFileSync(htmlPath, next, 'utf8');
        results.success.push(htmlPath);
      }
    } catch (e) {
      console.error(`❌ [comments] ${htmlPath}:`, e);
      results.failed.push(htmlPath);
    }
  });
  console.log(`[comments] обработано HTML: ${results.success.length}, ошибок: ${results.failed.length}`);
  return results;
}

module.exports = { runGeneration, injectIntoHtml, buildClientBundle, buildTemplatesHtml };