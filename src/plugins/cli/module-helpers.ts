import * as fs from 'node:fs';
import * as path from 'node:path';
import { toArgv } from './args.ts';

/**
 * Общий shape `options` для legacy-`runXxx(argv, options)`.
 * Structural typing: каждый `RunXxxOptions` — подмножество этих полей,
 * module.ts передаёт всё, legacy берёт что знает.
 */
export interface ModulePathOptions {
  docsDir?: string;
  generatedDir?: string;
  registryDir?: string;
  buildDir?: string;
  outDir?: string;
}

/**
 * Ключи opts, которые НЕ сериализуются в argv (pipeline-level).
 * - `logLevel` / `stopOnError` — Wave 3+ (logger/runner)
 * - `projectRoot` — `_paths.ts` уже резолвит env
 * - path-ключи — передаются через `options` (legacy не парсит их из argv)
 */
const NON_ARGV_KEYS: ReadonlySet<string> = new Set([
  'logLevel',
  'stopOnError',
  'projectRoot',
  'docsDir',
  'generatedDir',
  'registryDir',
  'buildDir',
  'outDir',
]);

/**
 * Разделяет `opts` (effective, из registry.run) на:
 *   - `argv` — для legacy `runXxx(argv)`;
 *   - `options` — для `runXxx(argv, options)`.
 */
export function splitModuleOpts(opts: Record<string, unknown>): {
  argv: string[];
  options: ModulePathOptions;
} {
  const options: ModulePathOptions = {};
  for (const k of ['docsDir', 'generatedDir', 'registryDir', 'buildDir', 'outDir'] as const) {
    const v = opts[k];
    if (typeof v === 'string') (options as Record<string, string>)[k] = v;
  }

  const argv = toArgv(opts, NON_ARGV_KEYS);
  return { argv, options };
}

/**
 * Резолв `<repo>/docs`:
 *   1) opts.docsDir (после legacy-алиасов `--docsDir`) — явный override;
 *   2) DOCS_PROJECT_ROOT env (ставится prelude `diplodoc-helper-cli.js`);
 *   3) `<cwd>/docs`.
 *
 * Соглашение: `docsDir` — это корень документации (`<repo>/docs`), не папка языка.
 * Папка языка — через `resolveLangDir`.
 */
export function resolveDocsDir(opts: Record<string, unknown>): string {
  const explicit = opts.docsDir;
  if (typeof explicit === 'string' && explicit.trim()) {
    return path.resolve(explicit);
  }
  const projectRoot = process.env.DOCS_PROJECT_ROOT
    ? path.resolve(process.env.DOCS_PROJECT_ROOT)
    : process.cwd();
  return path.join(projectRoot, 'docs');
}

/**
 * Резолв `<repo>/docs/<lang>`. Если `docsDir` уже заканчивается на `/<lang>`
 * (legacy: `--docsDir ./docs/ru`), возвращается как есть.
 */
export function resolveLangDir(opts: Record<string, unknown>, langFallback = 'ru'): string {
  const lang = String(opts.lang ?? langFallback);
  const base = resolveDocsDir(opts);
  if (path.basename(base) === lang) return base;
  return path.join(base, lang);
}

/**
 * Резолв `<cwd|projectRoot>/build` — build-директория для post-модулей.
 */
export function resolveBuildDir(opts: Record<string, unknown>): string {
  const explicit = opts.buildDir;
  if (typeof explicit === 'string' && explicit.trim()) return path.resolve(explicit);
  const projectRoot = process.env.DOCS_PROJECT_ROOT
    ? path.resolve(process.env.DOCS_PROJECT_ROOT)
    : process.cwd();
  return path.join(projectRoot, 'build');
}

/**
 * Ищет `<buildDir>/**\/<sectionName>/index.html`. Первое совпадение basename
 * (case-insensitive). Скипает `_`/`.`-директории. Используется `gostsInject`
 * и (в будущем) `footnoteList`.
 */
export function findSectionIndexHtml(buildDir: string, sectionName: string): string | null {
  const stack: string[] = [buildDir];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const full = path.join(dir, e.name);
      if (e.name.toLowerCase() === sectionName.toLowerCase()) {
        const indexHtml = path.join(full, 'index.html');
        if (fs.existsSync(indexHtml)) return indexHtml;
      }
      if (e.name.startsWith('_') || e.name.startsWith('.')) continue;
      stack.push(full);
    }
  }
  return null;
}

/**
 * Резолв `<repo>` (где `package.json` / `src/plugins`).
 *
 *  1) opts.projectRoot — явный override;
 *  2) `DOCS_PROJECT_ROOT` env — `<repo>/docs` → берём parent;
 *  3) `process.cwd()`.
 *
 * Отличие от `resolveDocsDir`: последний возвращает `<repo>/docs`,
 * а этот — `<repo>` (где лежат `plugins/` / `src/plugins/`).
 */
export function resolveProjectRoot(opts: Record<string, unknown>): string {
  const explicit = opts.projectRoot;
  if (typeof explicit === 'string' && explicit.trim()) return path.resolve(explicit);

  if (process.env.DOCS_PROJECT_ROOT) {
    const p = path.resolve(process.env.DOCS_PROJECT_ROOT);
    // `DOCS_PROJECT_ROOT` = `<repo>` или `<repo>/docs` (см. prelude CLI).
    // Для пути к `<repo>/src/plugins/...` нужен родитель `<repo>/docs`.
    return path.basename(p) === 'docs' ? path.dirname(p) : p;
  }
  return process.cwd();
}