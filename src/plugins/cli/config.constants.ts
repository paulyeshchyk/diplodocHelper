import type { ArgSpec, CommonOptions } from './types.ts';

/**
 * Общие аргументы, добавляемые к `ModuleDef.args` автоматически при
 * парсинге CLI-команды (`<module> --help`, `<module> --flag ...`).
 *
 * При `parseArgs(argv, [...commonArgs, ...moduleArgs])` — если common
 * и module определяют один и тот же флаг (например, `--lang`), module
 * доминирует (его дефолт переопределяет common).
 *
 * `--help` не входит — обрабатывается CLI-уровнем.
 */
export const DEFAULT_COMMON_ARGS: ReadonlyArray<ArgSpec> = [
  { name: 'lang', flag: '--lang', type: 'string', description: 'Язык', default: 'ru' },
  { name: 'docsProjectRoot', flag: '--docs-project-root', type: 'string', description: 'Корень docs-проекта' },
  { name: 'docsProjectRoot', flag: '--docsProjectRoot', type: 'string', description: '(legacy alias)' },
  { name: 'docsDir', flag: '--docs-dir', type: 'string', description: 'Override DOCS_DIR' },
  { name: 'docsDir', flag: '--docsDir', type: 'string', description: '(legacy alias)' },
  { name: 'generatedDir', flag: '--generated-dir', type: 'string', description: 'Override GENERATED_DIR' },
  { name: 'generatedDir', flag: '--generatedDir', type: 'string', description: '(legacy alias)' },
  { name: 'buildDir', flag: '--build-dir', type: 'string', description: 'Корень сборки' },
  { name: 'buildDir', flag: '--buildDir', type: 'string', description: '(legacy alias)' },
  { name: 'buildDir', flag: '--outputDir', type: 'string', description: '(legacy alias)' },
  { name: 'outDir', flag: '--out-dir', type: 'string', description: 'Куда писать результат' },
  { name: 'outDir', flag: '--outDir', type: 'string', description: '(legacy alias)' },
  { name: 'logLevel', flag: '--log-level', type: 'string', description: 'off|info|warning|error', default: 'off' },
  { name: 'stopOnError', flag: '--stop-on-error', type: 'boolean', description: 'Останавливаться при ошибке', default: true },
  { name: 'dryRun', flag: '--dry-run', type: 'boolean', description: 'Ничего не писать', default: false },
  { name: 'verbose', flag: '--verbose', type: 'boolean', description: '(deprecated) подробный лог', default: false },
];

/**
 * @deprecated Используйте `DEFAULT_COMMON_ARGS`.
 * Alias сохранён до конца Wave 5+ для минимального диффа в потребителях
 * (`registry.ts` уже переключён).
 */
export const COMMON_ARGS = DEFAULT_COMMON_ARGS;

/**
 * Значения common по умолчанию — для построения `CommonOptions` без
 * чтения yaml. Используется в Wave 2, когда `run-pipeline` ещё не
 * реализован, но `registry.run(name, argv, { ... })` уже работает.
 */
export const DEFAULT_COMMON: CommonOptions = {
  lang: 'ru',
  logLevel: 'info',
  stopOnError: true,
  dryRun: false,
  verbose: false,
};
