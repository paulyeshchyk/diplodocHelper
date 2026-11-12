// src/plugins/docs-registry/collect-catalog/collect-catalog.module.ts
import { splitModuleOpts } from '../../cli/module-helpers.ts';
import type { ModuleDef } from '../../cli/types.ts';

export const collectCatalogModule: ModuleDef = {
  name: 'collectCatalog',
  description: 'Собирает frontmatter всех модулей в catalog.json',
  phase: 'pre',
  defaultOrder: 10,
  args: [
    { name: 'modulePrefix', flag: '--module-prefix', type: 'string', description: 'Префикс папки модуля' },
    { name: 'lenient', flag: '--lenient', type: 'boolean', description: 'Не падать на неизвестных slug' },
    { name: 'probe', flag: '--probe', type: 'boolean', description: 'Только показать, не писать' },
    { name: 'catalog', flag: '--catalog', type: 'string', description: 'Путь к registry (переопределяет --registry)' },
    { name: 'registry', flag: '--registry', type: 'string', description: 'Путь к реестру' },
  ],
  async load() {
    const mod = await import('./index.ts');
    return {
      async run(opts) {
        const { argv, options } = splitModuleOpts(opts);
        await mod.runCollectCatalog(argv, options);
      },
    };
  },
};