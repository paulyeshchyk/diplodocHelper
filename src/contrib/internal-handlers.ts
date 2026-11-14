// src/contrib/internal-handlers.ts

import type { CommandHandler, CommandHandlers } from './types.ts';

/**
 * Команды, которые регистрируются через `registerCommand`,
 * но отсутствуют в `package.json#contributes.commands` (не видны в палитре/меню).
 * Пример: `ux-linter.pickAndReplace` — вызывается из code-action, не из UI.
 */
const lazy = (loader: () => CommandHandler): CommandHandler => {
    let cached: CommandHandler | null = null;
    return (...args) => {
        if (!cached) cached = loader();
        return cached(...args);
    };
};

export const INTERNAL_HANDLERS: CommandHandlers = {
    'ux-linter.pickAndReplace': lazy(
        () => require('../commands/vscode.linter.links.picker.js').pickAndReplace,
    ),
};