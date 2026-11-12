import type { Inspection } from '../init-config.types.ts';

/**
 * `_registry/layout.json` — «что считать модулем».
 *
 * Эвристики:
 *   - modulesFolder: `'Модули'` если найдена, иначе `null` (walk all);
 *   - modulePrefix: `'Модуль'` для Модули, `null` иначе;
 *   - moduleSectionTypes: `["Chapter", "Page"]` для иерархии, `null` для Модули;
 *   - skipDirs: базовые + найденные (`figures`, `helptags`, `roadmap`, `exts`,
 *     `Дополнительнаяинформация`, `ОРуководстве пользователя`);
 *   - strictDimensions: `true` для Модули, `false` для иерархии;
 *   - includeEmpty: `false` для Модули, `true` для иерархии.
 */
export function scaffoldLayout(inspection: Inspection): string {
  const { modulesFolder } = inspection;

  const skipDirs: string[] = [
    'figures',
    'helptags',
    'roadmap',
    'exts',
    'Дополнительнаяинформация',
    'ОРуководстве пользователя',
  ];

  const config = {
    modulesFolder,
    modulePrefix: inspection.modulePrefix,
    moduleIndexFile: 'index.md',
    moduleSectionTypes: modulesFolder === null ? ['Chapter', 'Page'] : null,
    outFolder: modulesFolder === null ? '_index' : 'Реестр',
    skipDirs,
    strictDimensions: modulesFolder !== null,
    includeEmpty: modulesFolder === null,
    emptyLabel: modulesFolder === null
      ? {
        content_type: 'Без типа',
        status: 'Без статуса',
        audience: 'Без АРМ',
        section: 'Без раздела',
      }
      : 'Без значения',
  };

  return JSON.stringify(config, null, 4) + '\n';
}