// src/contrib/build.ts

import type {
    CommandHandlers,
    CommandSpec,
    GeneratedContributes,
    KeyBindingSpec,
    MenuSpec,
} from './types.ts';

export function buildContributes(
    commands: ReadonlyArray<CommandSpec>,
    menus: ReadonlyArray<MenuSpec>,
    keybindings: ReadonlyArray<KeyBindingSpec> = [],
): GeneratedContributes {
    return {
        commands: commands.map(c => {
            if (c.title !== undefined && c.titleKey !== undefined) {
                throw new Error(
                    `CommandSpec "${c.id}": title and titleKey are mutually exclusive`,
                );
            }
            const title = c.title ?? (c.titleKey !== undefined ? `%${c.titleKey}%` : c.id);
            return { command: c.id, title };
        }),
        submenus: menus
            .filter((m): m is MenuSpec & { label: string } => typeof m.label === 'string')
            .map(m => ({ id: m.id, label: m.label })),
        menus: Object.fromEntries(menus.map(m => [m.id, m.items])),
        ...(keybindings.length > 0 ? { keybindings } : {}),
    };
}

export function buildCommandHandlers(
    commands: ReadonlyArray<CommandSpec>,
): CommandHandlers {
    return Object.fromEntries(commands.map(c => [c.id, c.handler]));
}

export function buildAllHandlers(
    commands: ReadonlyArray<CommandSpec>,
    internal: CommandHandlers = {},
): CommandHandlers {
    return { ...buildCommandHandlers(commands), ...internal };
}
