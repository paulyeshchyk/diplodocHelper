import { abbrTitlesModule } from '../abbrs/abbrs.injector.module.ts';
import { abbrsModule } from '../abbrs/abbrs.module.ts';
import { breadcrumbModule } from '../breadcrumb/breadcrumb.module.ts';
import { commentsModule } from '../comments/comments.module.ts';
import { footnoteListModule } from '../contentNavigator/footnoteList.module.ts';
import { periodicStatModule } from '../contentNavigator/periodicStat.module.ts';
import { periodicTableModule } from '../contentNavigator/periodicTable.module.ts';
import { periodicTableContextModule } from '../contentNavigator/periodicTableContext.module.ts';
import { periodicTableHelpTagModule } from '../contentNavigator/periodicTableHelpTag.module.ts';
import { contexttagsModule } from '../context-tags/context-tags.module.ts';
import { contextsModule } from '../contexts/contexts.module.ts';
import { buildPageLegendModule } from '../docs-registry/build-page-legend/build-page-legend.module.ts';
import { collectCatalogModule } from '../docs-registry/collect-catalog/collect-catalog.module.ts';
import { emitFeatureMapModule } from '../docs-registry/emit-feature-map/emit-feature-map.module.ts';
import { featureMapInjectModule } from '../docs-registry/emit-feature-map/feature-map.injector.module.ts';
import { emitModulesTableModule } from '../docs-registry/emit-modules-table/emit-modules-table.module.ts';
import { renderModulesModule } from '../docs-registry/render-modules/render-modules.module.ts';
import { createFigureContentModule } from '../figures/figures.module.ts';
import { footnoteAnchorsModule } from '../footnoteAnchors/footnoteAnchors.module.ts';
import { footnoteNumberingModule } from '../footnoteNumbering/footnoteNumbering.module.ts';
import { gostsInjectModule } from '../gosts/gosts.injector.module.ts';
import { gostsModule } from '../gosts/gosts.module.ts';
import { helpMapModule } from '../helpMap/helpmap.module.ts';
import { helptagsModule } from '../helptags/helptags.module.ts';
import { jsonToMdTableModule } from '../json-to-md/json-to-md.module.ts';
import { reindexFiguresModule } from '../reindexer/reindexer.figures.module.ts';
import { reindexFootnotesModule } from '../reindexer/reindexer.footnotes.module.ts';
import { ganttFixScrollModule } from '../roadMap/ganttFixScroll.module.ts';
import { roadMapModule } from '../roadMap/roadMap.module.ts';
import { termTitlesModule } from '../terms/terms.injector.module.ts';
import { termsModule } from '../terms/terms.module.ts';
import { tocCleanModeModule } from '../tocCleanMode/tocCleanMode.module.ts';
import { cleanBuildModule } from './cleanBuild.module.ts';
import { cleanupServiceFilesModule } from './cleanupServiceFiles.module.ts';
import { copyMdeditFixesModule } from './copyMdeditFixes.module.ts';
import { diplodocBuildModule } from './diplodocBuild.module.ts';
import { CommandRegistry } from './registry.ts';

export function createRegistry(): CommandRegistry {
  const r = new CommandRegistry();
  // Wave 2
  r.register(collectCatalogModule);
  r.register(buildPageLegendModule);
  r.register(renderModulesModule);
  r.register(emitModulesTableModule);
  r.register(emitFeatureMapModule);
  // Wave 5.1
  r.register(reindexFiguresModule);
  r.register(reindexFootnotesModule);
  r.register(createFigureContentModule);
  r.register(jsonToMdTableModule);
  // Wave 5.2
  r.register(helpMapModule);
  r.register(abbrsModule);
  r.register(termsModule);
  r.register(gostsModule);
  r.register(abbrTitlesModule);
  r.register(termTitlesModule);
  r.register(gostsInjectModule);
  // Wave 5.3
  r.register(contextsModule);
  r.register(helptagsModule);
  r.register(contexttagsModule);
  r.register(footnoteAnchorsModule);
  r.register(footnoteNumberingModule);
  r.register(footnoteListModule);
  r.register(tocCleanModeModule);
  // Wave 5.4
  r.register(featureMapInjectModule);
  r.register(breadcrumbModule);
  r.register(commentsModule);
  r.register(ganttFixScrollModule);
  r.register(periodicStatModule);
  r.register(periodicTableModule);
  r.register(periodicTableHelpTagModule);
  r.register(periodicTableContextModule);
  r.register(roadMapModule);
  // Wave 6
  r.register(cleanBuildModule);
  r.register(diplodocBuildModule);
  r.register(copyMdeditFixesModule);
  r.register(cleanupServiceFilesModule);
  return r;
}