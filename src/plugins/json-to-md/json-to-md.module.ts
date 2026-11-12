import type { ArgSpec, ModuleDef } from '../cli/types.ts';

type RunGenerationFn = (opts: Record<string, unknown>) => { success: boolean; outputPath?: string };

async function loadFn(): Promise<RunGenerationFn> {
  const mod = await import('./run-generation.js');
  const m = mod as unknown as { runGeneration: RunGenerationFn; default?: { runGeneration: RunGenerationFn } };
  return m.runGeneration ?? m.default!.runGeneration;
}

const ARGS: ArgSpec[] = [
  { name: 'jsonPath', flag: '--jsonPath', type: 'string', description: 'Путь к JSON' },
  { name: 'outputDir', flag: '--outputDir', type: 'string', description: 'Куда писать результат' },
  { name: 'outputFile', flag: '--outputFile', type: 'string', description: 'Имя итогового файла' },
  { name: 'schema', flag: '--schema', type: 'string', description: 'Имя схемы (known-issues, modules, …)' },
  { name: 'tableType', flag: '--tableType', type: 'string', description: 'extended|simple|grouped|treemap|matrix' },
  { name: 'xField', flag: '--xField', type: 'string', description: '(treemap) ось X' },
  { name: 'yField', flag: '--yField', type: 'string', description: '(treemap) ось Y' },
  { name: 'labelField', flag: '--labelField', type: 'string', description: '(treemap) подпись' },
  { name: 'valueField', flag: '--valueField', type: 'string', description: '(treemap) вес' },
  { name: 'valueAgg', flag: '--valueAgg', type: 'string', description: '(treemap) агрегат' },
  { name: 'classField', flag: '--classField', type: 'string', description: '(treemap) css-класс' },
  { name: 'groupBy', flag: '--groupBy', type: 'string', description: 'Поле группировки' },
  { name: 'groupSeparator', flag: '--groupSeparator', type: 'string', description: 'Разделитель группировки' },
  { name: 'groupFooter', flag: '--groupFooter', type: 'boolean', description: 'Футер группы' },
  { name: 'groupSplit', flag: '--groupSplit', type: 'boolean', description: 'Разбивать по разделителю' },
  { name: 'rowField', flag: '--rowField', type: 'string', description: '(matrix) строки' },
  { name: 'colField', flag: '--colField', type: 'string', description: '(matrix) столбцы' },
  { name: 'cellLabelField', flag: '--cellLabelField', type: 'string', description: '(matrix) подпись в ячейке' },
  { name: 'cellHrefField', flag: '--cellHrefField', type: 'string', description: '(matrix) ссылка в ячейке' },
  { name: 'emptyCell', flag: '--emptyCell', type: 'string', description: '(matrix) пустая ячейка' },
  { name: 'cellSeparator', flag: '--cellSeparator', type: 'string', description: '(matrix) разделитель в ячейке' },
  { name: 'omitEmpty', flag: '--omitEmpty', type: 'string', description: '(matrix) rows|cols|both' },
  { name: 'flat', flag: '--flat', type: 'boolean', description: '(treemap) плоский список' },
];

export const jsonToMdTableModule: ModuleDef = {
  name: 'jsonToMdTable',
  description: 'Генерирует md-таблицы из JSON (много специфичных флагов)',
  phase: 'pre',
  defaultOrder: 90,
  args: ARGS,
  async load() {
    const runGeneration = await loadFn();
    return {
      async run(opts) {
        const result = runGeneration(opts);
        if (!result.success) {
          throw new Error(`jsonToMdTable failed (jsonPath=${opts.jsonPath ?? '(default)'})`);
        }
      },
    };
  },
};