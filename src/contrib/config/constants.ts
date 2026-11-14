// src/contrib/config/constants.ts

// ============================================================================
// CONFIG — ключи VS Code-настроек (self-contained, не зависит от manifest/)
// ============================================================================

export const CONFIG_KEY = 'diplodoc-helper' as const;
export const CONFIG_TITLE = 'Diplodoc Helper' as const;

// ============================================================================
// WHEN — условия VS Code (when-clause)
// ============================================================================

export const WHEN = {
    // explorer
    EXPLORER_IS_FOLDER: 'explorerResourceIsFolder',
    EXPLORER_IS_FOLDER_OR_MD_OR_IMAGES:
        'explorerResourceIsFolder || resourceExtname == .md || resourceExtname == .png || resourceExtname == .jpg || resourceExtname == .svg',

    // editor: markdown
    EDITOR_LANG_MD_AND_SELECTION: '(editorLangId == markdown && editorHasSelection)',
    EDITOR_LANG_MD: '(editorLangId == markdown)',

    // editor: yaml
    EDITOR_LANG_YAML: '(editorLangId == yaml)',
    EDITOR_LANG_YAML_AND_SELECTION: '(editorLangId == yaml && editorHasSelection)',

    // editor: yaml OR markdown
    EDITOR_LANG_YAML_MD_YAML: '(editorLangId == yaml || editorLangId == markdown)',

    // editor: focus + paste-гейт (clipboard-check)
    EDITOR_TEXT_FOCUS_READONLY_AND_CAN_PASTE:
        'editorTextFocus && !editorReadonly && (diplodoc-helper:canPasteMarkdownLink || resourceFilename =~ /^(gosts|abbreviations)\\.yaml$/)',

    // editor: focus + .md
    EDITOR_TEXT_FOCUS_AND_EXTNAME_MD: '(editorTextFocus && resourceExtname == .md)',

    // editor: focus + не readonly
    EDITOR_TEXT_FOCUS_AND_NOT_READONLY: '(editorTextFocus && !editorReadonly)',

    // keybinding-gate для yaml.format — тот же контракт, что у команды
    KEYBINDING_YAML_FORMAT:
        'editorTextFocus && editorLangId == yaml && editorHasSelection',
} as const satisfies Record<string, string>;

export type WhenCondition = (typeof WHEN)[keyof typeof WHEN];

// ============================================================================
// GROUP — суффиксы групп (только для чтения, сортировка — в group-строке пункта)
// ============================================================================

export const GROUP = {
    DIPLODOC_SECTION: 'diplodoc.section',
    DIPLODOC_COPY: 'diplodoc.copy',
    DIPLODOC_CONTEXT: 'diplodoc.context',
    DIPLODOC_HELPTAG: 'diplodoc.helptag',
    DIPLODOC_GENERATORS: 'diplodoc.generators',
    DIPLODOC_FILES: 'diplodoc.files',
    DIPLODOC_NAVIGATION: 'diplodoc.navigation',
    DIPLODOC_MENU: 'diplodoc.menu',
    DIPLODOC_OTHER: 'diplodoc.other',
    DIPLODOC_LINT: 'diplodoc.lint',
    DIPLODOC_DEBUG: 'diplodoc.debug',
} as const satisfies Record<string, string>;

export type GroupKey = (typeof GROUP)[keyof typeof GROUP];

// ============================================================================
// GROUP_ORDER — численный префикс перед `.groupName`
// ============================================================================

export const GROUP_ORDER = {
    SECTION: 1,
    OTHER: 2,
    CONTEXT: 3,
    HELPTAG: 4,
    GENERATORS: 5,
    FILES: 6,
    NAVIGATION: 7,
    MENU: 8,
    BREADCRUMBS: 9,
    DEBUG: 10,
    SETTINGS: 99,
} as const satisfies Record<string, number>;

// ============================================================================
// SUBMENU — id подменю
// ============================================================================

export const SUBMENU = {
    EXPLORER: 'diplodoc.explorer.context.menu',
    EDITOR: 'diplodoc.editor.context.menu',
    HELPTAG: 'diplodoc.helptag.explorer.context.menu',
    CONTEXT: 'diplodoc.context.explorer.context.menu',
    OTHER: 'diplodoc.other.explorer.context.menu',
    REINDEXIER: 'diplodoc.reindexier.explorer.context.menu',
    LINT: 'diplodoc.lint.explorer.context.menu',
    ABBR: 'diplodoc.abbrs.explorer.context.menu',
    TERMS: 'diplodoc.terms.explorer.context.menu',
} as const satisfies Record<string, string>;

// ============================================================================
// MENU — id корневых меню
// ============================================================================

export const MENU = {
    EDITOR_CONTEXT: 'editor/context',
    EXPLORER_CONTEXT: 'explorer/context',
} as const satisfies Record<string, string>;

// ============================================================================
// Утилита сборки group-строки (единственное место, где живёт конвенция)
// ============================================================================

export interface GroupParts {
    /**
     * Префикс `groupName` — определяет **зону** пункта в меню.
     *
     * Механика VS Code: разделитель рисуется между соседними пунктами,
     * у которых разный `groupName`. `groupName` сортируются лексикографически,
     * поэтому префикс управляет одновременно **порядком** и **количеством
     * визуальных разделителей**.
     *
     * Конвенции (используйте осознанно, без ограничения типа):
     * - `''`   — основная зона (`7.diplodoc.section`);
     * - `'0'`  — до всех (`07.diplodoc.section`);
     * - `'z'`  — после всех (`z7.diplodoc.section`);
     * - `'a'`, `'b'`, `'c'`, … — доп. зоны между `''` и `'z'`,
     *   лексикографически (`'a…' < 'b…' < …`).
     *
     * Каждое уникальное значение → отдельная зона → визуальный
     * разделитель между этой и соседней зоной. N зон = N-1 разделителей.
     *
     * Пример (4 зоны, 3 разделителя):
     *   `''`      →  [items A1, A2]
     *   `'a'`     →  [items B1]
     *   `'b'`     →  [items C1, C2]
     *   `'z'`     →  [items D1]
     *
     * Trade-off: `string` открывает возможность для typos (`'Z'` vs `'z'`
     * — разные зоны). Для типовых случаев используйте `SEPARATOR_ZONE`.
     */
    readonly prefix?: string;
    readonly order: number;
    readonly group: GroupKey;
    readonly itemOrder: number;
}

/**
 * Стандартные зоны `groupName` для `buildGroup`. Не ограничение —
 * шпаргалка для типовых случаев. Произвольная строка в `prefix`
 * работает так же.
 */
export const SEPARATOR_ZONE = {
    BEFORE_ALL: '0',
    MAIN: '',
    ZONE_A: 'a',
    ZONE_B: 'b',
    ZONE_C: 'c',
    ZONE_D: 'd',
    AFTER_ALL: 'z',
} as const;

/**
 * Собирает VS Code-строку `'<sort>.<groupName>@<order>'`.
 *
 * Конвенция `prefix` — внутренняя, не из VS Code docs:
 * - `''`  — пункт в общей куче группы;
 * - `'z'` — после separator'а (визуально «в конце»);
 * - `'0'` — до separator'а (визуально «в начале»).
 *
 * Если в будущем понадобится «между separator'ами» — добавить префикс сюда,
 * не размазывать по 70 пунктам.
 */
export function buildGroup(parts: GroupParts): string {
    const prefix = parts.prefix ?? '';
    return `${prefix}${parts.order}.${parts.group}@${parts.itemOrder}`;
}