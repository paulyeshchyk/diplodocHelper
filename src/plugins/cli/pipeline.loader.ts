import * as yaml from 'js-yaml';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_COMMON } from './config.constants.ts';
import { DEFAULT_PIPELINE } from './pipeline.constants.ts';
import type {
  RawPipelineConfig,
  ResolvedPipeline,
} from './pipeline.types.ts';
import type { CommonOptions, PipelineEntry, PipelineStage } from './types.ts';

/**
 * Чтение `plugins.config.{yaml,yml,json}` и мерж с `DEFAULT_PIPELINE`.
 *
 * Поведение:
 *   - `configPath === null` → `DEFAULT_PIPELINE` (back-compat);
 *   - файл не существует → `DEFAULT_PIPELINE` + предупреждение (не throw,
 *     чтобы `run-pipeline` работал из target-project без конфига);
 *   - файл есть → merge.
 *
 * Merge:
 *   - `lang`: файла > default;
 *   - `common`: shallow merge (файла > default), поле за полем;
 *   - `stages.<phase>`: **массив файла заменяет default целиком**.
 *     Если хочется добавить модуль к дефолту — явно перечисли в файле.
 */
export function loadPipeline(configPath: string | null): ResolvedPipeline {
  if (!configPath) {
    console.warn(
      '[pipeline] plugins.config.yaml не найден — используется DEFAULT_PIPELINE ' +
      '(частичный: только мигрированные модули; полное legacy-поведение — ' +
      'через `npm run build` / docs-build.js до завершения Wave 5).',
    );
    return DEFAULT_PIPELINE;
  }

  if (!fs.existsSync(configPath)) {
    console.warn(
      `[pipeline] config не найден: ${configPath} — используется DEFAULT_PIPELINE`,
    );
    return DEFAULT_PIPELINE;
  }

  let raw: unknown;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    if (configPath.endsWith('.json')) {
      raw = JSON.parse(content);
    } else {
      raw = yaml.load(content);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`[pipeline] не удалось прочитать ${configPath}: ${msg}`);
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`[pipeline] ${configPath}: ожидался объект`);
  }

  const rawCfg = raw as RawPipelineConfig;

  const common: CommonOptions = {
    ...DEFAULT_COMMON,
    ...(rawCfg.common ?? {}),
  };

  const stages: PipelineStage = {
    pre: normalizeEntries(rawCfg.stages?.pre, DEFAULT_PIPELINE.stages.pre),
    build: normalizeEntries(rawCfg.stages?.build, DEFAULT_PIPELINE.stages.build),
    post: normalizeEntries(rawCfg.stages?.post, DEFAULT_PIPELINE.stages.post),
  };

  return {
    lang: rawCfg.lang ?? DEFAULT_PIPELINE.lang,
    common,
    stages,
    source: 'file',
    path: path.resolve(configPath),
  };
}

/**
 * Нормализация массива entries.
 *
 * - если поле отсутствует в raw → взять default;
 * - если `[]` явно → пустой массив (не default);
 * - каждый entry валидируется: `module` — строка.
 */
function normalizeEntries(
  raw: ReadonlyArray<PipelineEntry> | undefined,
  fallback: ReadonlyArray<PipelineEntry>,
): PipelineEntry[] {
  // undefined → fallback (нет секции = дефолт)
  if (raw === undefined) return [...fallback];

  // [] → пустая секция (явное «ничего»)
  if (!Array.isArray(raw)) {
    throw new Error(`[pipeline] stages.<phase> ожидался массив`);
  }

  const out: PipelineEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object' || typeof (e as PipelineEntry).module !== 'string') {
      throw new Error(`[pipeline] entry без "module": ${JSON.stringify(e)}`);
    }
    out.push(e);
  }
  return out;
}