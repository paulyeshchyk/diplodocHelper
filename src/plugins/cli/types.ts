/**
 * Контракты CLI: ModuleDef (метаданные модуля), PipelineConfig
 * (пользовательский конфиг), общие опции.
 *
 * Wave 1: только типы. Реализация runner'а — Wave 3.
 */

// ---------------------------------------------------------------------------
// Модуль
// ---------------------------------------------------------------------------

export interface ArgSpec {
  /** camelCase-ключ в opts. */
  name: string;
  /** CLI-флаг: '--anchor'. */
  flag: string;
  type: 'string' | 'boolean' | 'number';
  /** Для --list --yaml (машинное описание); в --help не используется. */
  description: string;
  default?: string | number | boolean;
  required?: boolean;
}

export interface ModuleDef {
  /** Уникальное имя. */
  name: string;
  /** Короткое описание для --list / --help. */
  description: string;
  /** Фаза в pipeline. */
  phase: 'pre' | 'build' | 'post';
  /** Suggestion для init-config. Не влияет на runtime. */
  defaultOrder: number;
  /** Мягкая зависимость: init-config warn, runtime нет. */
  dependsOn?: string[];
  /** Специфичные аргументы. CommonArgs добавляются автоматически. */
  args: ArgSpec[];
  /** Ленивая загрузка реализации. */
  load(): Promise<ModuleImpl>;
}

export interface ModuleImpl {
  run(opts: Record<string, unknown>): Promise<void>;
}

// ---------------------------------------------------------------------------
// Общие опции (L1 при merge)
// ---------------------------------------------------------------------------

export type LogLevel = 'off' | 'info' | 'warning' | 'error';

export interface CommonOptions {
  lang: string;
  docsProjectRoot?: string;
  docsDir?: string;
  generatedDir?: string;
  buildDir?: string;
  outDir?: string;
  logLevel: LogLevel;
  stopOnError: boolean;
  dryRun: boolean;
  verbose: boolean;   // deprecated в пользу logLevel
}

// ---------------------------------------------------------------------------
// Pipeline config
// ---------------------------------------------------------------------------

export interface PipelineEntry {
  module: string;
  enabled?: boolean;
  options?: Record<string, unknown>;
  [extraKey: string]: unknown;
}

export interface PipelineStage {
  readonly pre: ReadonlyArray<PipelineEntry>;
  readonly build: ReadonlyArray<PipelineEntry>;
  readonly post: ReadonlyArray<PipelineEntry>;
}

export interface PipelineConfig {
  lang: string;
  common: Partial<CommonOptions>;
  stages: PipelineStage;
}