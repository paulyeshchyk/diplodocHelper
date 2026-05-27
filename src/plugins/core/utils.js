/* eslint-disable no-undef */
// src/plugins/core/utils.js

const fs = require('fs');
const path = require('path');

/**
 * Рекурсивный обход директории с фильтром
 * @param {string} dir
 * @param {(fullPath: string, entry: fs.Dirent) => boolean} filter
 * @param {(fullPath: string) => void} callback
 */
function walk(dir, filter, callback) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, filter, callback);
    } else if (filter(fullPath, entry)) {
      callback(fullPath);
    }
  }
}

/**
 * Приводит строку к slug-формату (для URL, имён файлов)
 * @param {string} str
 */
function slugify(str) {
  return str
    .replace(/[^\p{L}\p{N}\-._]/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Извлекает заголовок из frontmatter или первого H1
 * @param {string} filePath
 * @returns {string | null}
 */
function getTitleFromMetadata(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf8');

  const metaMatch = content.match(/^---[\s\S]*?title:\s*(.*?)[\s\S]*?---/m);
  if (metaMatch?.[1]) return metaMatch[1].trim();

  const h1Match = content.match(/^#\s+(.*)/m);
  return h1Match ? h1Match[1].trim() : null;
}

/**
 * Проверяет, является ли файл HTML
 * @param {string} filePath
 */
function isHtmlFile(filePath) {
  return filePath.toLowerCase().endsWith('.html');
}

/**
 * Получает относительный путь от базовой директории
 * @param {string} baseDir
 * @param {string} fullPath
 */
function getRelativePath(baseDir, fullPath) {
  return path.relative(baseDir, fullPath).replace(/\\/g, '/');
}

/**
 * Проверяет, является ли путь корневым index.html
 * @param {string} buildDir
 * @param {string} htmlPath
 */
function isRootIndex(buildDir, htmlPath) {
  const fileName = path.basename(htmlPath);
  return fileName === 'index.html' && path.dirname(htmlPath) === buildDir;
}
/**
 * Проверяет, открыт ли документ через file:// протокол
 * @returns {boolean}
 */
function isFileProtocol() {
  // @ts-ignore
  return typeof window !== 'undefined' && window.location?.protocol === 'file:';
}

/**
 * Строит корректный href для хлебных крошек (учитывает file:// и http)
 * @param {string} lang
 * @param {string[]} parentSegments
 * @param {number} level
 * @returns {string}
 */
function buildBreadcrumbHref(lang, parentSegments, level) {
  const pathPart = parentSegments.slice(0, level + 1).join('/');

  if (isFileProtocol()) {
    // Для открытия из файловой системы — используем относительные пути
    // @ts-ignore
    const currentPath = window.location.pathname.replace(/\\/g, '/');
    const currentDirSegments = currentPath.split('/').filter(Boolean);

    // Примерная глубина от корня build
    const depth = Math.max(0, currentDirSegments.length - 2); // -2 = lang + filename

    let relative = '';
    for (let i = 0; i < depth; i++) {
      relative += '../';
    }
    return relative + lang + '/' + pathPart + '/';
  }

  // Для веб-сервера — абсолютный путь от корня
  return '/' + lang + '/' + pathPart + '/';
}

module.exports = {
  walk,
  slugify,
  getTitleFromMetadata,
  isHtmlFile,
  getRelativePath,
  isRootIndex,
  isFileProtocol,
  buildBreadcrumbHref,
};
