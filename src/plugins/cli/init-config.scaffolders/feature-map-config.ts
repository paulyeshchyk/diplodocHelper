import type { Inspection } from '../init-config.types.ts';

/**
 * `_registry/feature-map.config.json` — параметры отрисовки.
 *
 * Эвристики:
 *   - rowDimension: `section` если path-based, иначе `audience`;
 *   - columnDimension: `content_type`;
 *   - stripDimensions: оставшиеся (module, status, audience);
 *   - chipLabelField: `ident`.
 */
export function scaffoldFeatureMapConfig(inspection: Inspection): string {
  const { hasRazdelInPath, hasArmInPath } = inspection.heuristics;

  const rowDim = hasRazdelInPath ? 'section' : hasArmInPath ? 'audience' : 'module';
  const colDim = 'content_type';

  const stripDims: string[] = [];
  for (const d of ['module', 'audience', 'status', 'content_type'] as const) {
    if (d !== rowDim && d !== colDim) stripDims.push(d);
  }

  const stripLabels: Record<string, string> = {
    module: 'Модуль',
    audience: 'Аудитория',
    status: 'Статус',
  };

  const config = {
    outputPathTemplate: `{lang}/_index/feature-map/map.md`,
    moduleHrefAnchor: '',
    moduleHrefTemplate: '/{docsRootRel}/{dir}/index.html',
    stripDimensions: stripDims,
    stripLabels,
    rowDimension: rowDim,
    columnDimension: colDim,
    dimToFieldMap: {
      section: 'sections',
      content_type: 'content_types',
      audience: 'audiences',
      status: 'statuses',
      module: 'modules',
    },
    chipLabelField: 'ident',
    title: `${inspection.lang.toUpperCase()} Feature Map`,
    sectionType: 'Page',
    counterPlaceholder: 'Показано: —',
    resetButtonText: 'Сбросить все',
    emptyCellSymbol: '·',
  };

  return JSON.stringify(config, null, 4) + '\n';
}