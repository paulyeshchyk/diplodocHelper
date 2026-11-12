import * as fs from 'node:fs';
import { resolveDocsDir } from '../cli/module-helpers.ts';
import type { ArgSpec, ModuleDef } from '../cli/types.ts';

type Engine = 'mermaid' | 'plantuml';
type Fn = (opts: {
  docsRoot: string;
  dataPath?: string;
  dataRaw?: string;
  engine: Engine;
}) => Promise<void>;

async function loadFn(): Promise<Fn> {
  const mod = await import('./roadmap.js');
  const m = mod as unknown as { runGeneration: Fn; default?: { runGeneration: Fn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

const ARGS: ArgSpec[] = [
  { name: 'dataPath', flag: '--data-path', type: 'string', description: 'Путь к JSON с данными' },
  { name: 'dataPath', flag: '--dataPath', type: 'string', description: '(legacy alias)' },
  { name: 'dataRaw', flag: '--data-raw', type: 'string', description: 'JSON как строка' },
  { name: 'dataRaw', flag: '--dataRaw', type: 'string', description: '(legacy alias)' },
  { name: 'engine', flag: '--engine', type: 'string', description: 'mermaid|plantuml', default: 'mermaid' },
];

export const roadMapModule: ModuleDef = {
  name: 'roadMap',
  description: 'Генерирует страницу планов (roadmap)',
  phase: 'pre',
  defaultOrder: 70,
  args: ARGS,
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const docsRoot = resolveDocsDir(opts);
        if (!fs.existsSync(docsRoot)) {
          // legacy roadmap.js не защищён от несуществующего docsRoot —
          // оберегаем на уровне обёртки (Contributing §8).
          throw new Error(`roadMap: docsDir не найден: ${docsRoot}`);
        }
        const engine = (opts.engine === 'plantuml' ? 'plantuml' : 'mermaid') as Engine;
        await runGeneration({
          docsRoot,
          dataPath: typeof opts.dataPath === 'string' ? opts.dataPath : undefined,
          dataRaw: typeof opts.dataRaw === 'string' ? opts.dataRaw : undefined,
          engine,
        });
      },
    };
  },
};