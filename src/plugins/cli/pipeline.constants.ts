import { DEFAULT_COMMON } from './config.constants.ts';
import type { ResolvedPipeline } from './pipeline.types.ts';

/**
 * `DEFAULT_PIPELINE` — точно текущий `docs-build.js` (back-compat).
 *
 * Порядок в массивах = порядок выполнения. `defaultOrder` в `ModuleDef` —
 * только suggestion для `init-config`; в `DEFAULT_PIPELINE` порядок
 * зафиксирован явно.
 *
 * Wave 3: включены только 5 мигрированных модулей. Остальные 22 legacy
 * шага (`helpMap`, `contexts`, `reindexFigures`, …) — в `docs-build.js`,
 * не в `DEFAULT_PIPELINE`.
 */
export const DEFAULT_PIPELINE: Readonly<ResolvedPipeline> = Object.freeze({
  lang: 'ru',
  common: Object.freeze({ ...DEFAULT_COMMON }),
  stages: Object.freeze({
    pre: Object.freeze([
      { module: 'cleanBuild' },
      { module: 'collectCatalog' },
      { module: 'buildPageLegend', options: { rewrite: true, withInclude: true } },
      { module: 'renderModules', options: { rewrite: true, withInclude: true } },
      { module: 'emitModulesTable' },
      { module: 'emitFeatureMap' },
      { module: 'reindexFigures' },
      { module: 'reindexFootnotes' },
      { module: 'helpMap' },
      { module: 'periodicStat' },
      { module: 'contexts' },
      { module: 'helptags' },
      { module: 'abbrs' },
      { module: 'terms' },
      { module: 'gosts' },
      { module: 'createFigureContent' },
    ]),
    build: Object.freeze([
      { module: 'diplodocBuild' },
    ]),
    post: Object.freeze([
      { module: 'featureMapInject' },
      { module: 'footnoteAnchors' },
      { module: 'abbrTitles' },
      { module: 'termTitles' },
      { module: 'footnoteNumbering' },
      { module: 'gostsInject' },
      { module: 'copyMdeditFixes' },
      { module: 'breadcrumb' },
      { module: 'contexttags' },
      { module: 'comments' },
      { module: 'ganttFixScroll' },
      { module: 'periodicTable' },
      { module: 'periodicTableHelpTag' },
      { module: 'periodicTableContext' },
      { module: 'tocCleanMode' },
      { module: 'cleanupServiceFiles' },
    ]),
  }),
  source: 'default',
});