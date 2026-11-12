// src/plugins/docs-registry/build-page-legend/build-page-legend.module.ts
import { splitModuleOpts } from '../../cli/module-helpers.ts';
import type { ModuleDef } from '../../cli/types.ts';

export const buildPageLegendModule: ModuleDef = {
  name: 'buildPageLegend',
  description: 'Генерирует page-legend.md для модулей',
  phase: 'pre',
  defaultOrder: 20,
  dependsOn: ['collectCatalog'],
  args: [
    { name: 'rewrite', flag: '--rewrite', type: 'boolean', description: 'Перезаписать существующие' },
    { name: 'withInclude', flag: '--with-include', type: 'boolean', description: 'Добавить {% include %} в index.md' },
    { name: 'skipUnknown', flag: '--skip-unknown', type: 'boolean', description: 'Не падать на неизвестных slug' },
    { name: 'order', flag: '--order', type: 'string', description: 'custom|ascending|descending|none' },
    { name: 'ignore', flag: '--ignore', type: 'string', description: 'Свойства через запятую' },
    { name: 'catalog', flag: '--catalog', type: 'string', description: 'Путь к catalog.json' },
  ],
  async load() {
    const mod = await import('./index.ts');
    return {
      async run(opts) {
        const { argv, options } = splitModuleOpts(opts);
        await mod.runBuildPageLegend(argv, options);
      },
    };
  },
};