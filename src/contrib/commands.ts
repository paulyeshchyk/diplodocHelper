// src/contrib/commands.ts

import { CONFIG_KEY } from './constants.ts';
import type { CommandHandler, CommandSpec } from './types.ts';

/**
 * Ленивый loader. `require(...)` внутри thunk'а выполняется при первом
 * вызове handler'а — не при импорте `commands.ts`. Это позволяет
 * импортировать `COMMANDS` в Jest без `vscode` и без `sharp`/`electron`.
 */
const lazy = (loader: () => CommandHandler): CommandHandler => {
    let cached: CommandHandler | null = null;
    return (...args) => {
        if (!cached) cached = loader();
        return cached(...args);
    };
};

/** То же, но требует `vscode` внутри thunk'а — для inline-команд. */
const lazyVscode = (
    loader: (vscode: typeof import('vscode')) => CommandHandler,
): CommandHandler => {
    let cached: CommandHandler | null = null;
    return (...args) => {
        if (!cached) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const vscode = require('vscode') as typeof import('vscode');
            cached = loader(vscode);
        }
        return cached(...args);
    };
};

export const COMMANDS: ReadonlyArray<CommandSpec> = [
    // --- section / file ---
    {
        id: 'diplodoc-helper.createSection',
        titleKey: 'command.md.section.create',
        handler: lazy(() => require('../commands/diplodoc-helper.section.Create.js').ux_section_create),
    },
    {
        id: 'diplodoc-helper.deleteSection',
        titleKey: 'command.md.section.delete',
        handler: lazy(() => require('../commands/diplodoc-helper.section.Delete.js').ux_section_delete),
    },
    {
        id: 'diplodoc-helper.renameSection',
        titleKey: 'command.md.section.update',
        handler: lazy(() => require('../commands/diplodoc-helper.section.Rename.js').ux_section_rename),
    },
    {
        id: 'diplodoc-helper.moveSection',
        titleKey: 'command.md.section.move',
        handler: lazy(() => require('../commands/diplodoc-helper.section.Move.js').ux_section_move),
    },
    {
        id: 'diplodoc-helper.smart.delete',
        titleKey: 'command.smart.delete',
        handler: lazy(() => require('../commands/diplodoc-helper.smart.delete.js').ux_smart_delete),
    },
    {
        id: 'diplodoc-helper.file.delete',
        titleKey: 'command.file.delete.wipe_references',
        handler: lazy(() => require('../commands/diplodoc-helper.file.Delete.js').ux_file_delete),
    },

    // --- context / helptag ---
    {
        id: 'diplodoc-helper.context.Update',
        titleKey: 'command.md.context.update',
        handler: lazy(() => require('../commands/diplodoc-helper.context.Update.js').ux_context_update),
    },
    {
        id: 'diplodoc-helper.context.Delete',
        titleKey: 'command.md.context.delete',
        handler: lazy(() => require('../commands/diplodoc-helper.context.Delete.js').ux_context_delete),
    },
    {
        id: 'diplodoc-helper.helptag.Update',
        titleKey: 'command.md.helptag.update',
        handler: lazy(() => require('../commands/diplodoc-helper.helptag.Update.js').ux_helptag_update),
    },
    {
        id: 'diplodoc-helper.helptag.Delete',
        titleKey: 'command.md.helptag.delete',
        handler: lazy(() => require('../commands/diplodoc-helper.helptag.Delete.js').ux_helptag_delete),
    },

    // --- links ---
    {
        id: 'diplodoc-helper.link.addAnchor',
        titleKey: 'command.md.anchor.add',
        handler: lazy(() => require('../commands/diplodoc-helper.link.AddAnchor.js').ux_add_anchor),
    },
    {
        id: 'diplodoc-helper.copyLink',
        titleKey: 'command.md.link.copy',
        handler: lazy(() => require('../commands/diplodoc-helper.link.Copy.js').ux_link_copy),
    },
    {
        id: 'diplodoc-helper.pasteLink',
        titleKey: 'command.md.link.paste.fromClipboard',
        handler: lazy(() => require('../commands/diplodoc-helper.link.Paste.js').ux_link_paste),
    },

    // --- images ---
    {
        id: 'diplodoc-helper.pasteImageFromClipboard',
        titleKey: 'command.md.image.paste',
        handler: lazy(() => require('../commands/diplodoc-helper.image.PasteFromClipboard.js').ux_image_paste_clipboard),
    },
    {
        id: 'diplodoc-helper.pasteImageFromList',
        titleKey: 'command.md.link.paste.fromList',
        handler: lazy(() => require('../commands/diplodoc-helper.image.PasteFromList.js').ux_image_paste_list),
    },

    // --- reindex ---
    {
        id: 'diplodoc-helper.reindexDirectories',
        titleKey: 'command.fs.naming.update',
        handler: lazy(() => require('../commands/diplodoc-helper.reindex.directories.js').ux_reindex_directories),
    },
    {
        id: 'diplodoc-helper.reindexFigures',
        titleKey: 'command.md.link.rebuild',
        handler: lazy(() => require('../commands/diplodoc-helper.reindex.figures.js').ux_reindex_figures),
    },
    {
        id: 'diplodoc-helper.reindexFootnotes',
        titleKey: 'command.md.footnote.reindex',
        handler: lazy(() => require('../commands/diplodoc-helper.footnote.Reindex.js').ux_reindex_footnotes),
    },

    // --- generate / inject ---
    {
        id: 'diplodoc-helper.generateContexts',
        titleKey: 'command.fe.context.generate',
        handler: lazy(() => require('../commands/diplodoc-helper.context.Generate.js').ux_context_run_generation),
    },
    {
        id: 'diplodoc-helper.generateHelpMaps',
        titleKey: 'command.fe.helptag.generate',
        handler: lazy(() => require('../commands/diplodoc-helper.helpMap.Generate.js').ux_helpmap_generate),
    },
    {
        id: 'diplodoc-helper.generateBreadcrumbs',
        titleKey: 'command.html.breadcrumbs.generate',
        handler: lazy(() => require('../commands/diplodoc-helper.breadCrumb.Generate.js').ux_breadcrumbs_generate),
    },
    {
        id: 'diplodoc-helper.generateContextmap',
        title: 'diplodoc-helper.generateContextmap',
        handler: lazy(() => require('../commands/diplodoc-helper.contextmap.Generate.js').ux_contextmap_generate),
    },

    // --- abbr ---
    {
        id: 'diplodoc-helper.abbr.Add',
        titleKey: 'command.md.abbr.add',
        handler: lazy(() => require('../commands/diplodoc-helper.abbr.Add.js').ux_abbr_add),
    },
    {
        id: 'diplodoc-helper.generateAbbrs',
        titleKey: 'command.fe.abbrs.generate',
        handler: lazy(() => require('../commands/diplodoc-helper.abbr.Generate.js').ux_abbrs_generate),
    },
    {
        id: 'diplodoc-helper.linter.abbrs',
        titleKey: 'command.linter.abbrs.check',
        handler: lazy(() => require('../commands/diplodoc-helper.linter.abbrs.js').ux_linter_abbrs),
    },

    // --- terms ---
    {
        id: 'diplodoc-helper.term.Add',
        titleKey: 'command.md.term.add',
        handler: lazy(() => require('../commands/diplodoc-helper.term.Add.js').ux_term_add),
    },
    {
        id: 'diplodoc-helper.generateTerms',
        titleKey: 'command.fe.terms.generate',
        handler: lazy(() => require('../commands/diplodoc-helper.term.Generate.js').ux_terms_generate),
    },
    {
        id: 'diplodoc-helper.linter.terms',
        titleKey: 'command.linter.terms.check',
        handler: lazy(() => require('../commands/diplodoc-helper.linter.terms.js').ux_linter_terms),
    },

    // --- footnote ---
    {
        id: 'diplodoc-helper.footnote.add',
        titleKey: 'command.md.footnote.add',
        handler: lazy(() => require('../commands/diplodoc-helper.footnote.Add.js').ux_footnote_add),
    },

    // --- lint ---
    {
        id: 'diplodoc-helper.linter.links',
        titleKey: 'command.linter.links.check',
        handler: lazy(() => require('../commands/diplodoc-helper.linter.links.js').ux_linter_links),
    },

    // --- fs ---
    {
        id: 'diplodoc-helper.wipeEmptyDirectories',
        titleKey: 'command.fs.empty.wipe',
        handler: lazy(() => require('../commands/diplodoc-helper.context.WipeEmptyDirectories.js').ux_directories_wipe),
    },

    // --- gost ---
    {
        id: 'diplodoc-helper.gost.Insert',
        titleKey: 'command.md.gost.addOrInsert',
        handler: lazy(() => require('../commands/diplodoc-helper.gost.Insert.js').ux_gost_insert),
    },
    {
        id: 'diplodoc-helper.gost.Add',
        titleKey: 'command.md.gost.add',
        handler: lazy(() => require('../commands/diplodoc-helper.gost.Add.js').ux_gost_add),
    },

    // --- install ---
    {
        id: 'diplodoc-helper.installScripts',
        titleKey: 'command.installScripts',
        handler: lazy(() => require('../commands/diplodoc-helper.installScripts.js').ux_install_scripts),
    },

    // --- settings (inline, без отдельного модуля) ---
    {
        id: 'diplodoc-helper.settings',
        titleKey: 'command.settings',
        handler: lazyVscode(vscode => () =>
            vscode.commands.executeCommand('workbench.action.openSettings', CONFIG_KEY),
        ),
    },

    // --- yaml.format (новая, из волны 0.8) ---
    {
        id: 'diplodoc-helper.yaml.format',
        titleKey: 'command.md.format',
        handler: lazy(() => require('../commands/diplodoc-helper.yaml.format.js').ux_yaml_format_selection),
    },
];