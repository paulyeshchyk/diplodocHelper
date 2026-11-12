// src/plugins/docs-registry/emit-feature-map/emit-feature-map.module.ts
import { splitModuleOpts } from '../../cli/module-helpers.ts';
import type { ModuleDef } from '../../cli/types.ts';

export const emitFeatureMapModule: ModuleDef = {
  name: 'emitFeatureMap',
  description: 'Генерирует карту функционала (feature-map.md)',
  phase: 'pre',
  defaultOrder: 50,
  dependsOn: ['collectCatalog'],
  args: [
    { name: 'catalog', flag: '--catalog', type: 'string', description: 'Путь к catalog.json' },
    { name: 'config', flag: '--config', type: 'string', description: 'Путь к feature-map.config.json' },
    { name: 'out', flag: '--out', type: 'string', description: 'Куда писать map.md' },
  ],
  async load() {
    const mod = await import('./index.ts');
    return {
      async run(opts) {
        const { argv, options } = splitModuleOpts(opts);
        await mod.runEmitFeatureMap(argv, options);
      },
    };
  },
};