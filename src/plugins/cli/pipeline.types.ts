import type { CommonOptions, PipelineConfig, PipelineEntry, PipelineStage } from './types.ts';

/**
 * Тип, с которым приходит `plugins.config.yaml` (после `yaml.load`).
 * Все поля опциональны — реальный конфиг мержится с `DEFAULT_PIPELINE`.
 */
export interface RawPipelineConfig {
  lang?: string;
  common?: Partial<CommonOptions>;
  stages?: Partial<PipelineStage>;
}

/**
 * Effective pipeline после merge с `DEFAULT_PIPELINE`.
 * Все поля гарантированно заполнены.
 */
export interface ResolvedPipeline {
  lang: string;
  common: CommonOptions;
  stages: PipelineStage;
  /** Откуда взят конфиг (для `config --show` и логов). */
  source: 'default' | 'file';
  /** Абсолютный путь к файлу, если `source === 'file'`. */
  path?: string;
}

/**
 * Опции одного модуля после merge L1-L4.
 */
export interface EffectiveModuleOptions {
  /** Метаданные модуля. */
  moduleName: string;
  /** Специфичные аргументы + common из `PipelineEntry.options` (L2). */
  options: Record<string, unknown>;
  /** Финальный `enabled`: `false` → пропустить. */
  enabled: boolean;
}

export type { PipelineConfig, PipelineEntry, PipelineStage };
