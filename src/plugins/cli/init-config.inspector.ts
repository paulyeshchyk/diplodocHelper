import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Inspection } from './init-config.types.ts';

/**
 * Резолв docsDir от --project-root, а не от _paths.ts (тот читает env/process.cwd
 * однократно и не пересчитывается на --project-root; см. Contributing §2.7).
 *
 * Поддерживаем два типичных лэйаута:
 *   1) projectRoot = <repo>  → <repo>/docs           (или <repo>/docs/docs для Diplodoc-шаблона)
 *   2) projectRoot = <docs>  → <docs>                (пользователь указал docs-папку напрямую)
 */
function resolveDocsDir(projectRoot: string): string {
  const docsFromRoot = path.resolve(projectRoot, 'docs');
  if (fs.existsSync(docsFromRoot)) {
    const docsDocs = path.join(docsFromRoot, 'docs');
    if (fs.existsSync(docsDocs)) return docsDocs;
    return docsFromRoot;
  }
  // projectRoot уже является docs-директорией — если там есть _registry/_generated
  if (fs.existsSync(path.join(projectRoot, '_registry')) ||
    fs.existsSync(path.join(projectRoot, '_generated'))) {
    return path.resolve(projectRoot);
  }
  // ни <root>/docs, ни признаков docs — пусть вызывающий упадёт с понятным сообщением
  return docsFromRoot;  // → сработает `if (!fs.existsSync(docsDir)) throw`
}

/**
 * Инспектор проекта. Читает структуру, но не пишет.
 *
 * @param projectRoot — абсолютный путь к корню проекта (walk up to package.json).
 * @param langOverride — если задан `--lang`, использовать его.
 */
export function inspectProject(projectRoot: string, langOverride?: string): Inspection {
  const docsDir = resolveDocsDir(projectRoot);
  const warnings: string[] = [];

  if (!fs.existsSync(docsDir)) {
    throw new Error(`[init-config] docsDir не найден: ${docsDir}`);
  }

  const lang = langOverride ?? detectLang(docsDir);
  if (!lang) {
    throw new Error(
      `[init-config] не удалось определить язык в ${docsDir} ` +
      `(ожидалась папка с кодом из 2 букв: ru, en, …). Передайте --lang=<code>`,
    );
  }

  const langDir = path.join(docsDir, lang);
  if (!fs.existsSync(langDir)) {
    throw new Error(`[init-config] папка языка не найдена: ${langDir}`);
  }

  const modulesFolder = detectModulesFolder(langDir);
  const modulePrefix = modulesFolder === 'Модули' ? 'Модуль' : null;

  const registryDir = path.join(docsDir, '_registry');
  const existing = {
    layout: fs.existsSync(path.join(registryDir, 'layout.json')),
    fields: fs.existsSync(path.join(registryDir, 'fields.yaml')),
    featureMapConfig: fs.existsSync(path.join(registryDir, 'feature-map.config.json')),
    dimensions: fs.existsSync(path.join(registryDir, 'dimensions.yaml')),
    langYaml: fs.existsSync(path.join(registryDir, `${lang}.yaml`)),
  };

  const heuristics = {
    hasArmInPath: scanPaths(langDir, /АРМ\s+[А-Яа-я]/),
    hasRazdelInPath: scanPaths(langDir, /Раздел\s*\d/),
    hasGosts: fs.existsSync(path.join(langDir, 'Дополнительнаяинформация', 'ГОСТы')),
    hasKnownIssues: scanPaths(projectRoot, /known-issues-summary\.json$/),
    hasFootnoteList: scanPaths(langDir, /Переченьсносок$/),
  };

  if (!existing.layout && !existing.fields && !existing.dimensions && !existing.langYaml) {
    warnings.push(
      'В _registry/ нет ни layout.json, ни fields.yaml, ни dimensions.yaml/ru.yaml. ' +
      'init-config создаст дефолтные — проверьте их после.',
    );
  }

  return {
    projectRoot,
    docsDir,
    lang,
    modulesFolder,
    modulePrefix,
    existing,
    heuristics,
    warnings,
  };
}

function detectLang(docsDir: string): string | null {
  const entries = fs.readdirSync(docsDir, { withFileTypes: true });
  const langs = entries
    .filter(e => e.isDirectory() && /^[a-z]{2}$/i.test(e.name))
    .map(e => e.name);
  if (langs.length === 0) return null;
  if (langs.includes('ru')) return 'ru';
  return langs[0];
}

function detectModulesFolder(langDir: string): string | null {
  const candidates = ['Модули', 'booklets', 'manuals', 'guidelines'];
  for (const c of candidates) {
    if (fs.existsSync(path.join(langDir, c))) return c;
  }
  return null;
}

/**
 * Рекурсивный walk — есть ли в путях (директориях) совпадение с regex.
 * Останавливается на первой находке.
 */
function scanPaths(root: string, regex: RegExp): boolean {
  if (!fs.existsSync(root)) return false;
  let found = false;

  function walk(dir: string): void {
    if (found) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (found) return;
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      if (regex.test(e.name) || regex.test(full)) {
        found = true;
        return;
      }
      if (e.isDirectory()) walk(full);
    }
  }

  walk(root);
  return found;
}