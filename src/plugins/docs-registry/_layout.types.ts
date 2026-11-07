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
}