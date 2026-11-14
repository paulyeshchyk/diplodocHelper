// src/contrib/index.ts

export { COMMANDS } from './commands.ts';
export { MENUS } from './config/menus.ts';
export { KEYBINDINGS } from './config/keybindings.ts';
export { INTERNAL_HANDLERS } from './internal-handlers.ts';

export {
    WHEN, GROUP, GROUP_ORDER, SUBMENU, MENU,
    CONFIG_KEY, CONFIG_TITLE,
    buildGroup,
    type WhenCondition,
    type GroupKey,
    type GroupParts,
} from './config/constants.ts';

export { buildContributes, buildCommandHandlers } from './build.ts';

export type {
    CommandHandler,
    CommandHandlers,
    CommandSpec,
    GeneratedContributes,
    KeyBindingSpec,
    MenuItemSpec,
    MenuSpec,
} from './types.ts';