// src/contrib/types.ts

/**
 * Обработчик команды VS Code. Сигнатура намеренно свободная:
 * VS Code передаёт произвольные args через `registerCommand`.
 */
export type CommandHandler = (...args: unknown[]) => unknown;

export interface CommandSpec {
    /** ID команды, как в `vscode.commands.registerCommand`. */
    readonly id: string;
    /**
     * Ключ из `package.nls.json` (без `%`). В манифест попадает как `%<key>%`.
     * Пример: `'command.md.format'` → `'%command.md.format%'`.
     */
    readonly titleKey?: string;
    /**
     * Готовый raw-title (не переводится). Mutually exclusive с `titleKey`.
     * Используется для debug-команд с техническим именем.
     */
    readonly title?: string;
    readonly handler: CommandHandler;
}

export interface MenuItemSpec {
    readonly command?: string;
    readonly submenu?: string;
    /**
     * Условие VS Code (`when`-clause). Строка из `WHEN`-констант
     * предпочтительна; raw-строка допустима для ad-hoc случаев.
     */
    readonly when?: string;
    /**
     * Готовая группа VS Code: `'<sort>.<groupName>@<order>'`.
     * Сортировка — лексикографическая (VS Code docs).
     * Конвенция «после separator» — префикс `'z'`, до — `'0'`, без — пусто.
     * Примеры: `'7.diplodoc.section@9'`, `'z7.diplodoc.section@5'`, `'0navigation@1'`.
     */
    readonly group: string;
}

export interface MenuSpec {
    /** ID меню: `'editor/context'`, `'explorer/context'`, `'diplodoc.editor.context.menu'`, … */
    readonly id: string;
    /**
     * Если задан — меню попадает в `contributes.submenus` как `{id, label}`.
     * Если нет — только `contributes.menus` (root menu, e.g. `editor/context`).
     */
    readonly label?: string;
    readonly items: ReadonlyArray<MenuItemSpec>;
}

export interface KeyBindingSpec {
    readonly command: string;
    readonly key: string;
    readonly when?: string;
}

/**
 * Ровно то, что попадает в `package.json#contributes` от нашего генератора.
 * Остальные секции (`configuration`, `languages`, `themes`, …) — сохраняются
 * из существующего `package.json` (merge, не замена).
 */
export interface GeneratedContributes {
    readonly commands: ReadonlyArray<{ readonly command: string; readonly title: string }>;
    readonly submenus: ReadonlyArray<{ readonly id: string; readonly label: string }>;
    readonly menus: Readonly<Record<string, ReadonlyArray<MenuItemSpec>>>;
    readonly keybindings?: ReadonlyArray<KeyBindingSpec>;
}

export type CommandHandlers = Readonly<Record<string, CommandHandler>>;