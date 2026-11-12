import * as fs from 'node:fs';
import * as path from 'node:path';
import { inspectProject } from './init-config.inspector.ts';
import { createRegistry } from './modules.ts';
import { findProjectRoot } from './paths.ts';
import { extractFlag, hasFlag } from './pipeline.cli.args.ts';

import { scaffoldDimensions } from './init-config.scaffolders/dimensions.ts';
import { scaffoldFeatureMapConfig } from './init-config.scaffolders/feature-map-config.ts';
import { scaffoldFields } from './init-config.scaffolders/fields.ts';
import { scaffoldLayout } from './init-config.scaffolders/layout.ts';
import { scaffoldPipeline } from './init-config.scaffolders/pipeline.ts';

interface FileToWrite {
  /** Абсолютный путь. */
  path: string;
  /** Содержимое. */
  content: string;
  /** Человеческое имя для отчёта. */
  label: string;
}

interface InitConfigOptions {
  projectRoot: string | null;
  lang: string | null;
  dryRun: boolean;
  force: boolean;
  only: Set<string> | null;
}

/**
 * Шорткаты для `--only=`. Пользователь пишет `--only=layout`, а не
 * `--only=layout.json`. Ключи — внутренние имена, значения — label из
 * `FileToWrite`. См. `buildFiles()`.
 */
export const ONLY_SHORTCUTS: Readonly<Record<string, string>> = {
  plugins: 'plugins.config.yaml',
  pipeline: 'plugins.config.yaml',
  layout: 'layout.json',
  fields: 'fields.yaml',
  featureMap: 'feature-map.config.json',
  featuremap: 'feature-map.config.json',
  dimensions: 'dimensions.yaml',
};

/**
 *  
 */

const HELP = `
Использование: diplodoc-helper init-config [options]

Опции:
  --project-root=<path>   корень проекта (default: findProjectRoot(cwd))
  --lang=<code>           язык (default: detect из docs/<lang>)
  --dry-run               показать, ничего не писать
  --force                 перезаписать существующие файлы
  --only=<list>           создать только перечисленные (через запятую)
                          Шорткаты: plugins, pipeline (= plugins.config.yaml),
                                    layout, fields, featureMap, dimensions
  -h, --help              эта справка
`;

/**
 * CLI-entry `init-config`.
 *
 * Алгоритм:
 *   1. findProjectRoot (walk up to package.json);
 *   2. inspectProject (структура docs/);
 *   3. построить список файлов для записи (по `--only` или все);
 *   4. применить: `--dry-run` — только отчёт; `--force` — перезаписать;
 *      default — не трогать существующие.
 */
export async function initConfigCli(argv: string[]): Promise<void> {

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(HELP);
    return;
  }

  const opts: InitConfigOptions = {
    projectRoot: extractFlag(argv, '--project-root'),
    lang: extractFlag(argv, '--lang'),
    dryRun: hasFlag(argv, '--dry-run'),
    force: hasFlag(argv, '--force'),
    only: parseOnly(extractFlag(argv, '--only')),
  };

  // `init-config` ищет package.json-root, а не DOCS_PROJECT_ROOT:
  // последний — «где лежит docs/» (см. _paths.ts, Contributing §2.7),
  // и в типичном Diplodoc-репо `DOCS_PROJECT_ROOT = <repo>/docs`, что
  // сдвинуло бы plugins.config.yaml в `<repo>/docs/`.
  const projectRoot: string | null =
    opts.projectRoot
      ? path.resolve(opts.projectRoot)
      : findProjectRoot(process.cwd());

  if (!projectRoot) {
    throw new Error(
      `[init-config] не удалось найти корень проекта (package.json). ` +
      `Передайте --project-root=<path>`,
    );
  }

  const inspection = inspectProject(projectRoot, opts.lang ?? undefined);

  console.log('=== init-config ===');
  console.log(`projectRoot: ${inspection.projectRoot}`);
  console.log(`docsDir:     ${inspection.docsDir}`);
  console.log(`lang:        ${inspection.lang}`);
  console.log(`modulesFolder: ${inspection.modulesFolder ?? '(walk all)'}`);
  if (inspection.warnings.length > 0) {
    console.log('');
    for (const w of inspection.warnings) console.log(`  ⚠ ${w}`);
  }
  console.log('');

  const registry = createRegistry();
  const files = buildFiles(inspection, registry);
  const filtered = opts.only
    ? files.filter(f => opts.only!.has(f.label) || opts.only!.has(path.basename(f.label)))
    : files;

  let created = 0;
  let skipped = 0;
  let overwritten = 0;

  for (const f of filtered) {
    const exists = fs.existsSync(f.path);

    if (opts.dryRun) {
      const mark = exists ? (opts.force ? '↻' : '⚠') : '+';
      console.log(`  ${mark} ${f.label} — ${f.path}${exists && !opts.force ? ' (пропуск: есть)' : ''}`);
      continue;
    }

    if (exists && !opts.force) {
      console.log(`  - пропущен: ${f.label} (уже есть: ${f.path})`);
      skipped++;
      continue;
    }

    fs.mkdirSync(path.dirname(f.path), { recursive: true });
    fs.writeFileSync(f.path, f.content, 'utf8');

    if (exists) {
      console.log(`  ↻ перезаписан: ${f.label} — ${f.path}`);
      overwritten++;
    } else {
      console.log(`  + создан: ${f.label} — ${f.path}`);
      created++;
    }
  }

  if (opts.dryRun) {
    console.log('\nDRY-RUN: файлы не записаны');
  } else {
    console.log('');
    console.log(`Итог: создано ${created}, перезаписано ${overwritten}, пропущено ${skipped}`);
  }
}

function parseOnly(raw: string | null): Set<string> | null {
  if (!raw) return null;
  const resolved = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => ONLY_SHORTCUTS[s] ?? s);
  const set = new Set(resolved);
  return set.size > 0 ? set : null;
}

function buildFiles(
  inspection: ReturnType<typeof inspectProject>,
  registry: ReturnType<typeof createRegistry>,
): FileToWrite[] {
  const registryDir = path.join(inspection.docsDir, '_registry');
  return [
    {
      path: path.join(inspection.projectRoot, 'plugins.config.yaml'),
      content: scaffoldPipeline(inspection, registry),
      label: 'plugins.config.yaml',
    },
    {
      path: path.join(registryDir, 'layout.json'),
      content: scaffoldLayout(inspection),
      label: 'layout.json',
    },
    {
      path: path.join(registryDir, 'fields.yaml'),
      content: scaffoldFields(inspection),
      label: 'fields.yaml',
    },
    {
      path: path.join(registryDir, 'feature-map.config.json'),
      content: scaffoldFeatureMapConfig(inspection),
      label: 'feature-map.config.json',
    },
    {
      path: path.join(registryDir, 'dimensions.yaml'),
      content: scaffoldDimensions(inspection),
      label: 'dimensions.yaml',
    },
  ];
}