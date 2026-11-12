/**
 * Данные инспектора проекта и результаты скаффолдинга.
 */

export type LangCode = string;

/**
 * Результат инспекции. Все поля — только чтение, для скаффолдеров.
 */
export interface Inspection {
  /** Абсолютный путь к корню проекта (где package.json). */
  projectRoot: string;

  /**
   * Абсолютный путь к docs-папке (`_paths.DOCS_DIR`).
   * Может отличаться от `projectRoot/docs` (diplodoc-helper: `projectRoot/docs/docs`).
   */
  docsDir: string;

  /** Язык (первая папка `<docsDir>/<lang>/`). */
  lang: LangCode;

  /** Как называется папка модулей в `<docsDir>/<lang>/` (или `null` — walk all). */
  modulesFolder: string | null;

  /** Есть ли префикс папок модулей. */
  modulePrefix: string | null;

  /** Существующие файлы в `<docsDir>/_registry/`. */
  existing: {
    layout: boolean;
    fields: boolean;
    featureMapConfig: boolean;
    dimensions: boolean;
    langYaml: boolean;
  };

  /** Эвристики для `_fields.yaml`. */
  heuristics: {
    /** Найден ли путь с `АРМ X` — для path-based `audience`. */
    hasArmInPath: boolean;
    /** Найден ли путь с `РазделN` — для path-based `section`. */
    hasRazdelInPath: boolean;
    /** Есть ли `Дополнительнаяинформация/ГОСТы/`. */
    hasGosts: boolean;
    /** Есть ли `known-issues-summary.json` где-то. */
    hasKnownIssues: boolean;
    /** Есть ли `Переченьсносок/`. */
    hasFootnoteList: boolean;
  };

  /** Предупреждения (не критичные). */
  warnings: string[];
}