// src/plugins/docs-registry/render-modules/render-modules.module.ts
import { splitModuleOpts } from '../../cli/module-helpers.ts';
import type { ModuleDef } from '../../cli/types.ts';

export const renderModulesModule: ModuleDef = {
  name: 'renderModules',
  description: 'Генерирует modules.md для каждого измерения',
  phase: 'pre',
  defaultOrder: 30,
  dependsOn: ['collectCatalog'],
  args: [
    { name: 'rewrite', flag: '--rewrite', type: 'boolean', description: 'Перезаписать существующие' },
    { name: 'withInclude', flag: '--with-include', type: 'boolean', description: 'Добавить {% include %}' },
    { name: 'outName', flag: '--out-name', type: 'string', description: 'Имя файла (default: modules.md)' },
    { name: 'anchor', flag: '--anchor', type: 'string', description: 'Якорь ссылок' },
    { name: 'catalog', flag: '--catalog', type: 'string', description: 'Путь к catalog.json' },
  ],
  async load() {
    const mod = await import('./index.ts');
    return {
      async run(opts) {
        const { argv, options } = splitModuleOpts(opts);
        await mod.runRenderModules(argv, options);
      },
    };
  },
};