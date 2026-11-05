/**
 * Типы для feature-map.
 *
 * Отделены от реализации, чтобы:
 *   - `index.ts` / `feature-map.injector.ts` ссылались через `import type`;
 *   - `feature-map.constants.ts` типизировал `DEFAULT_FEATURE_MAP_CONFIG`;
 *   - тесты `57.1.*` / `57.2.*` импортировали через `import type`.
 *
 * ⚠️ Структура `CatalogSnapshot` соответствует output'у `collect-catalog`
 * (см. `src/plugins/docs-registry/collect-catalog/index.js`). Изменения
 * там = изменение типа здесь.
 */

export interface CatalogDimensionItem {
    dir: string;
    title: string;
}

export interface CatalogDimension {
    title?: string;
    columns?: Array<{ label: string; field: string }>;
    items: Record<string, CatalogDimensionItem>;
}

/**
 * Один модуль из `catalog.modules`. Поля `actors`/`layers`/`families`/`capabilities`
 * соответствуют `dimensions.*.items` — это слаги, а не отображаемые имена.
 * `designation` может отсутствовать — `escHtml(undefined)` → `''`.
 */
export interface CatalogModule {
    dir: string;
    id: string;
    ident: string;
    actors?: string[];
    layers?: string[];
    families?: string[];
    capabilities?: string[];
    designation?: string;
    [key: string]: unknown;
}

/**
 * Снимок каталога — то, что читается из `catalog.<lang>.json`.
 */
export interface CatalogSnapshot {
    /** Абсолютный путь к папке с модулями. */
    docsRoot: string;
    modules: Record<string, CatalogModule>;
    dimensions: Record<string, CatalogDimension>;
    /** `dimName → { slug → [moduleDir, ...] }`. */
    index: Record<string, Record<string, string[]>>;
}

/**
 * Конфиг по умолчанию для feature-map.
 *
 * ⚠️ Step 4: этот объект станет прототипом для override'а через
 * CLI `--config`. Поля с пометкой `@configurable` — целевые.
 */
export interface FeatureMapConfig {
    /**
     * Шаблон пути для `feature-map.md` относительно `DOCS_DIR`.
     * `{lang}` подставляется из `--lang`.
     * @configurable
     */
    outputPathTemplate: string;

    /**
     * Якорь на карточке модуля в сгенерированной ссылке.
     * @configurable
     */
    moduleHrefAnchor: string;

    /**
     * Шаблон href на карточку модуля.
     * Плейсхолдеры: `{docsRootRel}`, `{dir}`, `{anchor}`.
     * @configurable
     */
    moduleHrefTemplate: string;

    /**
     * Измерения, рендерящиеся как полосы фильтров над сеткой.
     * @configurable
     */
    stripDimensions: ReadonlyArray<string>;

    /**
     * Отображаемые подписи для strip-измерений.
     * @configurable
     */
    stripLabels: Readonly<Record<string, string>>;

    /** Измерение — строки сетки. @configurable */
    rowDimension: string;

    /** Измерение — колонки сетки. @configurable */
    columnDimension: string;

    /**
     * Соответствие «имя измерения в каталоге → имя поля в `CatalogModule`».
     *
     * Дефолт: `{ actor: 'actors', capability: 'capabilities', layer: 'layers', family: 'families' }`.
     * Alt-проект: `{ audience: 'audiences', topic: 'topics', stage: 'stages' }`.
     *
     * Используется для `countBy` и `cells` — без него нельзя построить
     * ячейки произвольного измерения.
     *
     * @configurable
     */
    dimToFieldMap: Readonly<Record<string, string>>;

    /** Заголовок в frontmatter и `<h1>`. @configurable */
    title: string;

    /** `sectionType` в frontmatter. @configurable */
    sectionType: string;

    /** Плейсхолдер счётчика до инициализации клиента. @configurable */
    counterPlaceholder: string;

    /** Текст кнопки сброса. @configurable */
    resetButtonText: string;

    /** Символ пустой ячейки. */
    emptyCellSymbol: string;
}