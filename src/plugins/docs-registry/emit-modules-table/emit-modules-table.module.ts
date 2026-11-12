// src/plugins/docs-registry/emit-modules-table/emit-modules-table.module.ts
import { splitModuleOpts } from '../../cli/module-helpers.ts';
import type { ModuleDef } from '../../cli/types.ts';

export const emitModulesTableModule: ModuleDef = {
  name: 'emitModulesTable',
  description: 'Строит modules-table.<lang>.json из catalog.json',
  phase: 'pre',
  defaultOrder: 40,
  dependsOn: ['collectCatalog'],
  args: [
    { name: 'catalog', flag: '--catalog', type: 'string', description: 'Путь к catalog.json' },
    { name: 'out', flag: '--out', type: 'string', description: 'Куда писать JSON' },
    { name: 'outDir', flag: '--out-dir', type: 'string', description: 'Базис для относительных ссылок' },
    { name: 'anchor', flag: '--anchor', type: 'string', description: 'Якорь ссылок на модули' },
    { name: 'sort', flag: '--sort', type: 'string', description: 'id|ident|folder' },
  ],
  async load() {
    const mod = await import('./index.ts');
    return {
      async run(opts) {
        const { argv, options } = splitModuleOpts(opts);
        await mod.runEmitModulesTable(argv, options);
      },
    };
  },
};