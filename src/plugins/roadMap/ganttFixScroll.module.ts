import { resolveBuildDir } from '../cli/module-helpers.ts';
import type { ModuleDef } from '../cli/types.ts';

type Engine = 'mermaid' | 'plantuml';
type Fn = (opts: { buildDir: string; engine: Engine }) => Promise<void>;

async function loadFn(): Promise<Fn> {
  const mod = await import('./post-build.js');
  const m = mod as unknown as { runGeneration: Fn; default?: { runGeneration: Fn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

export const ganttFixScrollModule: ModuleDef = {
  name: 'ganttFixScroll',
  description: 'Инжектит pan/zoom и links в gantt-диаграммы',
  phase: 'post',
  defaultOrder: 50,
  args: [
    { name: 'engine', flag: '--engine', type: 'string', description: 'mermaid|plantuml', default: 'mermaid' },
  ],
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const engine = (opts.engine === 'plantuml' ? 'plantuml' : 'mermaid') as Engine;
        await runGeneration({ buildDir: resolveBuildDir(opts), engine });
      },
    };
  },
};