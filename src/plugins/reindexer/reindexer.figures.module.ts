import { resolveLangDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type ReindexFiguresFn = (
  rootDir: string,
  targetLocale: string,
  cfg: unknown,
) => { success: boolean; total: number; reason?: string };

type ConfigFn = (configKey: string) => { targetLocale: string; configObj: unknown };

async function loadDeps(): Promise<{ reindexFigures: ReindexFiguresFn; getConfig: ConfigFn; CONFIG_KEY: string }> {
  const [figMod, cfgMod, constMod] = await Promise.all([
    import('./reindexer.figures.js'),
    import('../../config/diplodoc.config.js'),
    import('../../contrib/config/constants.ts'),
  ]);
  const fig = figMod as unknown as { reindexFigures: ReindexFiguresFn; default?: { reindexFigures: ReindexFiguresFn } };
  const reindexFigures = fig.reindexFigures ?? fig.default!.reindexFigures;

  const cfg = cfgMod as unknown as { DiplodocConfigFromCli: ConfigFn; default?: { DiplodocConfigFromCli: ConfigFn } };
  const getConfig = cfg.DiplodocConfigFromCli ?? cfg.default!.DiplodocConfigFromCli;

  const c = constMod as unknown as { CONFIG_KEY: string; default?: { CONFIG_KEY: string } };
  return { reindexFigures, getConfig, CONFIG_KEY: c.CONFIG_KEY ?? c.default!.CONFIG_KEY };
}

export const reindexFiguresModule: ModuleDef = {
  name: 'reindexFigures',
  description: 'Переиндексирует рисунки в документации',
  phase: 'pre',
  defaultOrder: 60,
  args: [],
  async load() {
    const deps = await loadDeps();
    return {
      async run(opts) {
        const lang = String(opts.lang ?? 'ru');
        const rootDir = resolveLangDir(opts, lang);
        const { configObj } = deps.getConfig(deps.CONFIG_KEY);

        const result = deps.reindexFigures(rootDir, lang, configObj);
        if (!result.success) {
          throw new Error(`reindexFigures: ${result.reason ?? 'unknown'}`);
        }
      },
    };
  },
};