/**
 * Формат `<docsDir>/_registry/layout.json` — per-project конфигурация
 * «что считать модулем» и «куда писать артефакты».
 *
 * Отсутствие файла = дефолт (`DEFAULT_LAYOUT`): Модули/Модуль/Реестр —
 * 100 % back - compat с diplodoc - helper до волны C.
 *
 * Отсутствующее ** отдельное ** поле в существующем файле — мерж с дефолтом
  * (shallow), т.е.можно переопределить только то, что нужно.
 */
export interface LayoutConfig {
  /**
   * Папка с модулями относительно `<docsDir>/<lang>`.
   * `null` — модули лежат прямо в `<docsDir>/<lang>` (иерархические
   * проекты: MES, ГОСТ-структура Часть/Раздел/Глава/Статья).
   */
  modulesFolder: string | null;

  /**
   * Префикс папки-модуля (например `'Модуль'` для `МодульCLI`).
   * `null` — walk all папок с `moduleIndexFile` (телефоны, MES).
   */
  modulePrefix: string | null;

  /** Имя файла-индекса модуля. По умолчанию `'index.md'`. */
  moduleIndexFile: string;

  /**
   * Белый список `sectionType` — какие типы считаются модулями.
   * `null` — фильтр не применяется (back-compat).
   * `["Page"]` — только статьи, Части/Разделы/Главы отсеиваются (MES).
   */
  moduleSectionTypes: string[] | null;

  /**
   * Имя папки, в которой `emit-modules-table` кладёт `modules.md`,
   * относительно `<dimension.dir>`. По умолчанию `'Реестр'`.
   */
  outFolder: string;

  /**
   * Дополнительные папки (basename), которые не считать модулями даже
   * при `modulePrefix: null`. Например, `figures`, `helptags`, `roadmap`,
   * `Дополнительнаяинформация` — они имеют `index.md` с `sectionType: Page`,
   * но не являются статьями.
   *
   * По умолчанию — пусто (back-compat). Мерж с дефолтным `SKIP_DIRS`
   * в `collect-catalog`.
   */
  skipDirs: string[];

  /**
   * Строгая проверка неизвестных slug'ов в измерениях.
   * - `true` (по умолчанию): `collect-catalog` бросает `throw` при первом
   *   unknown (с `--lenient` — warning без auto-register).
   * - `false`: warning + auto-register в runtime (`catalog.dimensions`),
   *   `dimensions.yaml` **не** изменяется. Используется, когда реестр
   *   измерений не претендует на «полный список» (MES).
   */
  strictDimensions: boolean;

  /**
   * Включать ли «пустые» модули в `index` (модули без значения измерения).
   * - `false` (default): не включать;
   * - `true`: включать для всех измерений;
   * - `string[]`: только для перечисленных измерений.
   *
   * Пустые получают служебный slug `__empty__` в `catalog.index` и
   * `catalog.dimensions.<dim>.items`.
   */
  includeEmpty: boolean | string[];

  /**
   * Отображаемый label для `__empty__`.
   * - `string`: общий для всех измерений;
   * - `object`: per-dim, например `{ content_type: "Без типа" }`;
   * - default: `'Без значения'`.
   */
  emptyLabel: string | Record<string, string>;
}

export const EMPTY_SLUG = '__empty__';