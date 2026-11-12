import { resolveBuildDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type Fn = (buildDir: string) => void;

async function loadFn(): Promise<Fn> {
  const mod = await import('./post-build.js');
  const m = mod as unknown as { injectCleanMode: Fn; default?: { injectCleanMode: Fn } };
  return m.injectCleanMode ?? m.default!.injectCleanMode;
}

export const tocCleanModeModule: ModuleDef = {
  name: 'tocCleanMode',
  description: 'Инжектит clean-mode скрипт в HTML (скрывает левое меню по ?clean)',
  phase: 'post',
  defaultOrder: 70,
  args: [],
  async load() {
    const injectCleanMode = await loadFn();
    return {
      async run(opts) {
        injectCleanMode(resolveBuildDir(opts));
      },
    };
  },
};