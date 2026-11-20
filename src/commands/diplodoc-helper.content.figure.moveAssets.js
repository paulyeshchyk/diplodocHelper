// src/commands/diplodoc-helper.content.figure.moveAssets.js
'use strict';

const fs = require('fs');
const path = require('path');
const {
  parseMarkdownLinks,
  splitMdPathQueryHash,
  updateLinksInContent,
} = require('./diplodoc-helper.links.md');
const { decodeLinkPath, encodePathSegments } = require('./diplodoc-helper.links.coder');
const { isExternalLink } = require('../plugins/shared/parser/md/mdLinks');
const { findFiles } = require('./diplodoc-helper.files');
const { getLanguageRoot } = require('../plugins/utils/path.directory.js');

/**
 * Проверяет, что файл изображения напрямую связан с исходным MD-файлом
 * (лежит в директории sourceDir или её подпапках, а не в общих каталогах выше по дереву).
 * @param {string} absImagePath
 * @param {string} sourceDir
 * @returns {boolean}
 */
function isDirectlyOwnedAsset(absImagePath, sourceDir) {
  const rel = path.relative(path.resolve(sourceDir), path.resolve(absImagePath));
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Локальные image-цели из фрагмента (тела <figure>), непосредственно принадлежащие sourceDir.
 * @param {string} fragment
 * @param {string} sourceFilePath
 * @returns {Array<{ absPath: string, rawInFragment: string, isImage: boolean }>}
 */
function collectLocalImageTargets(fragment, sourceFilePath) {
  const links = parseMarkdownLinks(fragment);
  const sourceDir = path.dirname(sourceFilePath);
  const result = [];
  const seen = new Set();

  for (const link of links) {
    if (!link.isImage) continue;
    if (isExternalLink(link)) continue;

    const { pathPart } = splitMdPathQueryHash(link.rawPath);
    const decoded = decodeLinkPath(pathPart);
    if (!decoded || decoded.startsWith('#')) continue;

    const abs = path.resolve(sourceDir, decoded);
    if (!isDirectlyOwnedAsset(abs, sourceDir)) continue;

    if (seen.has(abs)) continue;
    seen.add(abs);

    result.push({
      absPath: abs,
      rawInFragment: pathPart,
      isImage: true,
    });
  }
  return result;
}

/**
 * Внешние MD-файлы, ссылающиеся на absImagePath.
 * sourceFilePath исключается: оставшиеся в нём ссылки обновляются в памяти через editor.edit.
 * @param {string} absImagePath
 * @param {string} projectRoot
 * @param {string | null} excludePath
 */
async function findReferencesToImage(absImagePath, projectRoot, excludePath = null) {
  const allMd = await findFiles(projectRoot, '.md');
  const refs = [];
  const targetResolved = path.resolve(absImagePath);
  const excludeResolved = excludePath ? path.resolve(excludePath) : null;

  for (const filePath of allMd) {
    if (excludeResolved && path.resolve(filePath) === excludeResolved) {
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const links = parseMarkdownLinks(content);
      let count = 0;
      for (const link of links) {
        if (isExternalLink(link)) continue;
        const { pathPart } = splitMdPathQueryHash(link.rawPath);
        const decoded = decodeLinkPath(pathPart);
        const abs = path.resolve(path.dirname(filePath), decoded);
        if (abs === targetResolved) count++;
      }
      if (count > 0) {
        refs.push({ filePath, linkCount: count });
      }
    } catch (e) {
      console.warn(`[figure.moveAssets] skip ${filePath}:`, String(e));
    }
  }
  return refs;
}

/**
 * @param {string} absImagePath
 * @param {string} sourceFilePath
 * @param {string} targetFilePath
 * @returns {{ destPath: string, relativeFromTarget: string, destDir: string }}
 */
function planImageDestination(absImagePath, sourceFilePath, targetFilePath) {
  const sourceDir = path.dirname(sourceFilePath);
  const targetDir = path.dirname(targetFilePath);
  const fileName = path.basename(absImagePath);

  const relFromSource = path.relative(sourceDir, absImagePath);
  const relDir = path.dirname(relFromSource);

  /** @type {string} */
  let destDir;
  if (!relDir || relDir === '.') {
    destDir = targetDir;
  } else {
    destDir = path.join(targetDir, relDir);
  }

  const destPath = path.join(destDir, fileName);
  let relativeFromTarget = path.relative(targetDir, destPath).split(path.sep).join('/');
  if (!relativeFromTarget.startsWith('.')) {
    relativeFromTarget = './' + relativeFromTarget;
  }

  return { destPath, relativeFromTarget, destDir };
}

/**
 * @param {{ filePath: string, linkCount: number }[]} refs
 * @param {string} oldAbs
 * @param {string} newAbs
 */
async function rewriteReferences(refs, oldAbs, newAbs) {
  const updatedFiles = [];
  for (const { filePath } of refs) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = updateLinksInContent(
      content,
      filePath,
      absoluteTarget => {
        if (path.resolve(absoluteTarget) === path.resolve(oldAbs)) {
          return newAbs;
        }
        return undefined;
      },
      null,
    );
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      updatedFiles.push(filePath);
    }
  }
  return updatedFiles;
}

/**
 * Копирует (или планирует) ассеты figure, обновляет внешние MD-ссылки на новый путь.
 * Исходные файлы удаляются только в commitMovedAssets после успешной вставки текста.
 *
 * @param {string} fragment — обычно тела полных <figure>
 * @param {string} sourceFilePath
 * @param {string} targetFilePath
 * @param {{ mode?: 'copy' | 'rename' }} [options]
 * @returns {Promise<{
 *   moved: Array<{ from: string, to: string, copied: boolean }>,
 *   updatedRefFiles: string[],
 *   pathRemap: Map<string, string>,
 *   warnings: string[],
 *   refSnapshots: Array<{ filePath: string, before: string }>,
 *   sourceFilePath: string,
 * }>}
 */
async function moveFigureAssets(fragment, sourceFilePath, targetFilePath, options = {}) {
  const mode = options.mode === 'rename' ? 'rename' : 'copy';
  const projectRoot =
    getLanguageRoot(sourceFilePath) ||
    path.dirname(sourceFilePath);

  const images = collectLocalImageTargets(fragment, sourceFilePath);
  /** @type {Array<{ from: string, to: string, copied: boolean }>} */
  const moved = [];
  /** @type {string[]} */
  const updatedRefFiles = [];
  const pathRemap = new Map();
  /** @type {string[]} */
  const warnings = [];
  /** @type {Array<{ filePath: string, before: string }>} */
  const refSnapshots = [];

  for (const img of images) {
    if (!fs.existsSync(img.absPath)) {
      warnings.push(`Файл изображения не найден: ${img.absPath}`);
      continue;
    }

    const { destPath, destDir } = planImageDestination(
      img.absPath,
      sourceFilePath,
      targetFilePath,
    );

    if (path.resolve(img.absPath) === path.resolve(destPath)) {
      pathRemap.set(img.absPath, destPath);
      continue;
    }

    if (fs.existsSync(destPath)) {
      warnings.push(`Целевой файл уже существует, пропуск: ${destPath}`);
      pathRemap.set(img.absPath, destPath);
      continue;
    }

    // Исключаем sourceFilePath (и targetFilePath на случай, если в нём уже была ссылка)
    // из дисковой перезаписи — открытые редакторы обновим через WorkspaceEdit/TextEditorEdit
    const refs = await findReferencesToImage(img.absPath, projectRoot, sourceFilePath);

    for (const { filePath } of refs) {
      if (!refSnapshots.some(s => s.filePath === filePath)) {
        refSnapshots.push({
          filePath,
          before: fs.readFileSync(filePath, 'utf8'),
        });
      }
    }

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    if (mode === 'rename') {
      fs.renameSync(img.absPath, destPath);
      moved.push({ from: img.absPath, to: destPath, copied: false });
    } else {
      fs.copyFileSync(img.absPath, destPath);
      moved.push({ from: img.absPath, to: destPath, copied: true });
    }

    pathRemap.set(img.absPath, destPath);

    const rewritten = await rewriteReferences(refs, img.absPath, destPath);
    updatedRefFiles.push(...rewritten);
  }

  return {
    moved,
    updatedRefFiles,
    pathRemap,
    warnings,
    refSnapshots,
    sourceFilePath,
  };
}

/**
 * Удаляет пустые подпапки внутри sourceDir (например, опустевшую images/),
 * не трогая саму директорию исходного документа.
 * @param {string} dirPath
 * @param {string} stopDir
 */
function cleanupEmptySubdirs(dirPath, stopDir) {
  return;

  // const resolvedStop = path.resolve(stopDir);
  // let current = path.resolve(dirPath);

  // while (current !== resolvedStop && current.startsWith(resolvedStop + path.sep)) {
  //   try {
  //     if (!fs.existsSync(current)) break;
  //     const entries = fs.readdirSync(current);
  //     if (entries.length > 0) break;
  //     fs.rmdirSync(current);
  //     current = path.dirname(current);
  //   } catch {
  //     break;
  //   }
  // }
}

/**
 * После успешной вставки текста: удалить исходники (режим copy) и пустые подпапки.
 * @param {{ moved: Array<{ from: string, to: string, copied: boolean }>, sourceFilePath?: string }} assetResult
 */
async function commitMovedAssets(assetResult) {
  const sourceDir = assetResult.sourceFilePath
    ? path.dirname(assetResult.sourceFilePath)
    : null;

  for (const m of assetResult.moved) {
    if (!m.copied) continue;
    try {
      if (fs.existsSync(m.from) && path.resolve(m.from) !== path.resolve(m.to)) {
        fs.unlinkSync(m.from);
        if (sourceDir) {
          cleanupEmptySubdirs(path.dirname(m.from), sourceDir);
        }
      }
    } catch (e) {
      console.warn(`[figure.moveAssets] commit unlink failed ${m.from}:`, e);
    }
  }
}

/**
 * Откат: удалить скопированные dest, вернуть содержимое MD из снимков.
 * @param {{
 *   moved: Array<{ from: string, to: string, copied: boolean }>,
 *   refSnapshots?: Array<{ filePath: string, before: string }>,
 * }} assetResult
 */
async function rollbackMovedAssets(assetResult) {
  for (const m of assetResult.moved) {
    try {
      if (m.copied) {
        if (fs.existsSync(m.to)) fs.unlinkSync(m.to);
      } else if (fs.existsSync(m.to) && !fs.existsSync(m.from)) {
        fs.renameSync(m.to, m.from);
      }
    } catch (e) {
      console.warn(`[figure.moveAssets] rollback file failed:`, e);
    }
  }

  if (Array.isArray(assetResult.refSnapshots)) {
    for (const snap of assetResult.refSnapshots) {
      try {
        fs.writeFileSync(snap.filePath, snap.before, 'utf8');
      } catch (e) {
        console.warn(`[figure.moveAssets] rollback refs failed ${snap.filePath}:`, e);
      }
    }
  }
}

/**
 * Адаптирует относительные ссылки в фрагменте с учётом pathRemap перенесённых картинок.
 * @param {string} fragment
 * @param {string} sourceFilePath
 * @param {string} targetFilePath
 * @param {Map<string, string>} pathRemap
 */
function adaptFragmentWithRemap(fragment, sourceFilePath, targetFilePath, pathRemap) {
  const sourceDir = path.dirname(sourceFilePath);
  const targetDir = path.dirname(targetFilePath);
  const links = parseMarkdownLinks(fragment);
  if (links.length === 0) return { content: fragment, adaptedCount: 0 };

  let result = '';
  let last = 0;
  let adaptedCount = 0;

  for (const link of links) {
    result += fragment.slice(last, link.index);

    if (isExternalLink(link)) {
      result += link.full;
      last = link.index + link.full.length;
      continue;
    }

    const { pathPart, query, hash } = splitMdPathQueryHash(link.rawPath);
    const decoded = decodeLinkPath(pathPart);
    if (!decoded || decoded.startsWith('#')) {
      result += link.full;
      last = link.index + link.full.length;
      continue;
    }

    const oldAbs = path.resolve(sourceDir, decoded);
    const mappedAbs = pathRemap.has(oldAbs) ? pathRemap.get(oldAbs) : oldAbs;
    if (!mappedAbs) {
      result += link.full;
      last = link.index + link.full.length;
      continue;
    }

    let newRel = path.relative(targetDir, mappedAbs).split(path.sep).join('/');
    if (!newRel.startsWith('.') && !path.isAbsolute(newRel)) {
      newRel = './' + newRel;
    }
    const encoded = encodePathSegments(newRel);
    const prefix = link.isImage ? '!' : '';
    const newFull = `${prefix}[${link.text}](${encoded}${query}${hash})`;
    if (newFull !== link.full) adaptedCount++;
    result += newFull;
    last = link.index + link.full.length;
  }

  result += fragment.slice(last);
  return { content: result, adaptedCount };
}

/**
 * Находит в тексте документа (вне [excludeStart, excludeEnd)) все ссылки на файлы из pathRemap
 * и возвращает список замен с точными символьными смещениями [start, end).
 * Используется для безопасного обновления оставшихся ссылок в sourceDoc через editor.edit.
 *
 * @param {string} fullText
 * @param {string} docFilePath
 * @param {Map<string, string>} pathRemap
 * @param {number} excludeStart
 * @param {number} excludeEnd
 * @returns {Array<{ start: number, end: number, replacement: string }>}
 */
function computeInDocumentRemapEdits(
  fullText,
  docFilePath,
  pathRemap,
  excludeStart,
  excludeEnd,
) {
  if (!pathRemap || pathRemap.size === 0) return [];

  const docDir = path.dirname(docFilePath);
  const links = parseMarkdownLinks(fullText);
  const edits = [];

  for (const link of links) {
    const linkStart = link.index;
    const linkEnd = link.index + link.full.length;

    // Ссылки внутри вырезаемого диапазона удалятся вместе с фрагментом
    if (linkStart >= excludeStart && linkEnd <= excludeEnd) continue;
    if (isExternalLink(link)) continue;

    const { pathPart, query, hash } = splitMdPathQueryHash(link.rawPath);
    const decoded = decodeLinkPath(pathPart);
    if (!decoded || decoded.startsWith('#')) continue;

    const oldAbs = path.resolve(docDir, decoded);
    if (!pathRemap.has(oldAbs)) continue;

    const newAbs = pathRemap.get(oldAbs);
    if (!newAbs) continue;

    let newRel = path.relative(docDir, newAbs).split(path.sep).join('/');
    if (!newRel.startsWith('.') && !path.isAbsolute(newRel)) {
      newRel = './' + newRel;
    }

    const encoded = encodePathSegments(newRel);
    const prefix = link.isImage ? '!' : '';
    const newFull = `${prefix}[${link.text}](${encoded}${query}${hash})`;

    if (newFull !== link.full) {
      edits.push({ start: linkStart, end: linkEnd, replacement: newFull });
    }
  }

  return edits;
}


/**
 * Подбирает свободный путь файла у приёмника (pic.png → pic_1.png, pic_2.png...),
 * чтобы при дублировании не затереть уже существующую картинку с таким же именем.
 * @param {string} destPath
 * @returns {string}
 */
function resolveUniqueDestPath(destPath) {
  if (!fs.existsSync(destPath)) return destPath;

  const dir = path.dirname(destPath);
  const ext = path.extname(destPath);
  const base = path.basename(destPath, ext);

  let counter = 1;
  while (true) {
    const candidate = path.join(dir, `${base}_${counter}${ext}`);
    if (!fs.existsSync(candidate)) {
      return candidate;
    }
    counter++;
  }
}

/**
 * Копирует локальные картинки, принадлежащие sourceDir, в директорию targetDir
 * (для команды «Дублирование»). Исходники не удаляются, внешние ссылки не трогаются.
 *
 * @param {string} fragment — весь выделенный MD-фрагмент
 * @param {string} sourceFilePath
 * @param {string} targetFilePath
 * @returns {Promise<{
 *   copied: Array<{ from: string, to: string }>,
 *   pathRemap: Map<string, string>,
 *   warnings: string[],
 * }>}
 */
async function duplicateLocalAssets(fragment, sourceFilePath, targetFilePath) {
  // Собираем все локальные картинки из выделения, лежащие внутри папки источника
  const images = collectLocalImageTargets(fragment, sourceFilePath);

  /** @type {Array<{ from: string, to: string }>} */
  const copied = [];
  const pathRemap = new Map();
  /** @type {string[]} */
  const warnings = [];

  for (const img of images) {
    if (!fs.existsSync(img.absPath)) {
      warnings.push(`Файл изображения не найден: ${img.absPath}`);
      continue;
    }

    const { destPath: plannedDest, destDir } = planImageDestination(
      img.absPath,
      sourceFilePath,
      targetFilePath,
    );

    // Если источник и приёмник в одной папке — дублировать файл не нужно,
    // ссылка продолжит вести на тот же файл
    if (path.resolve(img.absPath) === path.resolve(plannedDest)) {
      pathRemap.set(img.absPath, plannedDest);
      continue;
    }

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const finalDestPath = resolveUniqueDestPath(plannedDest);
    if (finalDestPath !== plannedDest) {
      warnings.push(
        `Файл ${path.basename(plannedDest)} уже существует у приёмника, скопирован как ${path.basename(finalDestPath)}.`,
      );
    }

    fs.copyFileSync(img.absPath, finalDestPath);
    copied.push({ from: img.absPath, to: finalDestPath });
    pathRemap.set(img.absPath, finalDestPath);
  }

  return { copied, pathRemap, warnings };
}

/**
 * Откат скопированных при дублировании файлов в случае сбоя вставки текста.
 * @param {{ copied: Array<{ from: string, to: string }> }} dupResult
 */
async function rollbackDuplicatedAssets(dupResult) {
  for (const item of dupResult.copied) {
    try {
      if (fs.existsSync(item.to)) {
        fs.unlinkSync(item.to);
      }
    } catch (e) {
      console.warn(`[figure.moveAssets] rollback duplicate failed ${item.to}:`, e);
    }
  }
}

module.exports = {
  isDirectlyOwnedAsset,
  collectLocalImageTargets,
  findReferencesToImage,
  planImageDestination,
  moveFigureAssets,
  commitMovedAssets,
  rollbackMovedAssets,
  adaptFragmentWithRemap,
  computeInDocumentRemapEdits,
  duplicateLocalAssets,
  rollbackDuplicatedAssets
};