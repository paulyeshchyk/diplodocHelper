import { createLogger } from '../utils/logger/index.ts';
import { isEntryEnabled, loadPluginConfig, mergeModuleOptions, resolveModuleConfigPath } from './pipeline.merge.ts';
import type { ResolvedPipeline } from './pipeline.types.ts';
import type { CommandRegistry } from './registry.ts';

export interface RunPipelineOptions {
  stage: 'pre' | 'build' | 'post' | 'all';
  projectRoot: string | null;
}

export interface RunPipelineResult {
  executed: string[];
  skipped: string[];
  failed: Array<{ module: string; error: string }>;
  ok: boolean;
}

export async function runPipeline(
  pipeline: ResolvedPipeline,
  registry: CommandRegistry,
  opts: RunPipelineOptions,
): Promise<RunPipelineResult> {
  const log = createLogger('runner', { logLevel: pipeline.common.logLevel });
  const stages: Array<'pre' | 'build' | 'post'> =
    opts.stage === 'all' ? ['pre', 'build', 'post'] : [opts.stage];

  const result: RunPipelineResult = {
    executed: [],
    skipped: [],
    failed: [],
    ok: true,
  };

  for (const phase of stages) {
    const entries = pipeline.stages[phase];
    log.info(`\n▶ [${phase}] ${entries.length} шагов`);

    for (const entry of entries) {
      const moduleName = entry.module;

      if (!isEntryEnabled(entry)) {
        log.info(`  ↷ ${moduleName}: disabled`);
        result.skipped.push(moduleName);
        continue;
      }

      const def = registry.get(moduleName);
      if (!def) {
        const msg = `модуль "${moduleName}" не зарегистрирован`;
        if (pipeline.common.stopOnError) {
          throw new Error(`[pipeline] ${msg}`);
        }
        log.error(`  ✗ ${moduleName}: ${msg}`);
        result.failed.push({ module: moduleName, error: msg });
        result.ok = false;
        continue;
      }

      const pluginConfigPath = resolveModuleConfigPath(opts.projectRoot, moduleName);
      const L3 = pluginConfigPath ? loadPluginConfig(pluginConfigPath) : null;
      const mergedOpts = mergeModuleOptions(entry, pipeline.common, L3, def.args);

      try {
        log.info(`  ▶ ${moduleName}`);
        await registry.run(moduleName, [], mergedOpts);
        log.info(`  ✓ ${moduleName}`);
        result.executed.push(moduleName);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.failed.push({ module: moduleName, error: msg });
        result.ok = false;
        if (pipeline.common.stopOnError) {
          log.error(`  ✗ ${moduleName}: ${msg}`);
          throw e;
        }
        log.error(`  ✗ ${moduleName}: ${msg} (продолжаем: stopOnError=false)`);
      }
    }
  }

  return result;
}