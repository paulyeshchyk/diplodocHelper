// plugins/cli/pipeline.cli.ts

import * as path from 'node:path';
import { initLogger, getLogger } from '../utils/logger/index.ts';
import { createRegistry } from './modules.ts';
import { findProjectRoot, resolveConfigPath } from './paths.ts';
import { extractFlag, hasFlag } from './pipeline.cli.args.ts';
import { loadPipeline } from './pipeline.loader.ts';
import { runPipeline } from './pipeline.runner.ts';

/**
 * `run-pipeline` — CLI-команда.
 *
 * Пример:
 *   diplodoc-helper-cli run-pipeline --stage=pre
 *   diplodoc-helper-cli run-pipeline --stage=all --config=./ci/plugins.config.yaml
 *   diplodoc-helper-cli run-pipeline --stage=pre --project-root=./docs
 */
export async function runPipelineCli(argv: string[]): Promise<void> {
  const stageRaw = extractFlag(argv, '--stage') ?? 'all';
  const validStages = new Set(['pre', 'build', 'post', 'all']);
  if (!validStages.has(stageRaw)) {
    throw new Error(`--stage: допустимо pre|build|post|all, получено "${stageRaw}"`);
  }

  const cliConfig = extractFlag(argv, '--config');
  const cliProjectRoot = extractFlag(argv, '--project-root');

  const projectRoot =
    cliProjectRoot ??
    (process.env.DOCS_PROJECT_ROOT
      ? path.resolve(process.env.DOCS_PROJECT_ROOT)
      : null) ??
    findProjectRoot(process.cwd());

  if (!projectRoot) {
    throw new Error(
      `[pipeline] не удалось найти корень проекта (package.json). ` +
      `Передайте --project-root=<path>`,
    );
  }

  // yaml.common.logLevel перебивает env-default (приоритет: yaml > env).
  // Так «logLevel: off в plugins.config.yaml» наконец-то реально замолкает.
  const configPath = resolveConfigPath(cliConfig, projectRoot);
  const pipeline = loadPipeline(configPath);
  initLogger({ level: pipeline.common.logLevel });

  // Свой scoped-логгер. initLogger выше гарантирует правильный level.
  const log = getLogger().child({ module: 'pipeline.cli' });

  // legacy docs-build.js всегда запускал модули с cwd=projectRoot.
  // run-pipeline должен вести себя так же — иначе относительные пути
  // в `--jsonPath ./docs/…` / `--dataPath ./plugins/…` разрешатся
  // от cwd пользователя (напр., `<repo>/docs`), а не от `<repo>`.
  try {
    process.chdir(projectRoot);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.warn(`[run-pipeline] не удалось chdir в ${projectRoot}: ${msg}`);
  }

  if (hasFlag(argv, '--dry-run')) {
    log.info(`[run-pipeline] config: ${pipeline.source === 'file' ? pipeline.path : '(default)'}`);
    log.info(`[run-pipeline] stage: ${stageRaw}`);
    log.info(`[run-pipeline] projectRoot: ${projectRoot}`);
    return;
  }

  const registry = createRegistry();
  const result = await runPipeline(pipeline, registry, {
    stage: stageRaw as 'pre' | 'build' | 'post' | 'all',
    projectRoot,
  });

  log.info(`Итог:`);
  log.info(`  выполнено: ${result.executed.length}`);
  log.info(`  пропущено: ${result.skipped.length}`);
  log.info(`  ошибок:    ${result.failed.length}`);
  if (!result.ok) process.exitCode = 1;
}