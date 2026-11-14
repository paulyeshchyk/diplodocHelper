// src/contrib/menus.ts

import {
    GROUP, GROUP_ORDER, MENU, SUBMENU, WHEN, buildGroup,
} from './constants.ts';
import type { MenuSpec } from './types.ts';

export const MENUS: ReadonlyArray<MenuSpec> = [
    // ========================================================================
    // ROOT: editor/context → подменю Diplodoc-Helper
    // ========================================================================
    {
        id: MENU.EDITOR_CONTEXT,
        items: [
            {
                submenu: SUBMENU.EDITOR,
                when: WHEN.EDITOR_TEXT_FOCUS_AND_NOT_READONLY,
                group: buildGroup({
                    order: GROUP_ORDER.MENU,
                    group: GROUP.DIPLODOC_MENU,
                    itemOrder: 1,
                }),
            },
        ],
    },

    // ========================================================================
    // ROOT: explorer/context → подменю Diplodoc-Helper
    // ========================================================================
    {
        id: MENU.EXPLORER_CONTEXT,
        items: [
            {
                submenu: SUBMENU.EXPLORER,
                group: buildGroup({
                    order: GROUP_ORDER.MENU,
                    group: GROUP.DIPLODOC_MENU,
                    itemOrder: 1,
                }),
            },
        ],
    },

    // ========================================================================
    // EXPLORER: подменю (секции, ссылки, вложенные подменю)
    // ========================================================================
    {
        id: SUBMENU.EXPLORER,
        label: '%submenu.diplodoc%',
        items: [
            {
                command: 'diplodoc-helper.createSection',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.SECTION, group: GROUP.DIPLODOC_SECTION, itemOrder: 1,
                }),
            },
            {
                command: 'diplodoc-helper.smart.delete',
                when: WHEN.EXPLORER_IS_FOLDER_OR_MD_OR_IMAGES,
                group: buildGroup({
                    order: GROUP_ORDER.SECTION, group: GROUP.DIPLODOC_SECTION, itemOrder: 2,
                }),
            },
            {
                command: 'diplodoc-helper.renameSection',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.SECTION, group: GROUP.DIPLODOC_SECTION, itemOrder: 3,
                }),
            },
            {
                command: 'diplodoc-helper.moveSection',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.SECTION, group: GROUP.DIPLODOC_SECTION, itemOrder: 4,
                }),
            },
            {
                command: 'diplodoc-helper.copyLink',
                when: WHEN.EXPLORER_IS_FOLDER_OR_MD_OR_IMAGES,
                group: buildGroup({
                    prefix: 'z',
                    order: GROUP_ORDER.SECTION, group: GROUP.DIPLODOC_SECTION, itemOrder: 5,
                }),
            },
            {
                submenu: SUBMENU.OTHER,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: 'z',
                    order: GROUP_ORDER.OTHER, group: GROUP.DIPLODOC_OTHER, itemOrder: 1,
                }),
            },
            {
                submenu: SUBMENU.LINT,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: 'z',
                    order: GROUP_ORDER.OTHER, group: GROUP.DIPLODOC_LINT, itemOrder: 2,
                }),
            },
            {
                submenu: SUBMENU.DEBUG,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: 'z',
                    order: GROUP_ORDER.OTHER, group: GROUP.DIPLODOC_DEBUG, itemOrder: 3,
                }),
            },
        ],
    },

    // ========================================================================
    // EDITOR: подменю (ссылки, вставки, выделение, yaml.format)
    // ========================================================================
    {
        id: SUBMENU.EDITOR,
        label: '%submenu.diplodoc%',
        items: [
            {
                command: 'diplodoc-helper.link.addAnchor',
                when: WHEN.EDITOR_LANG_MD_AND_SELECTION,
                group: buildGroup({
                    order: GROUP_ORDER.NAVIGATION, group: GROUP.DIPLODOC_SECTION, itemOrder: 1,
                }),
            },
            {
                command: 'diplodoc-helper.pasteLink',
                when: WHEN.EDITOR_TEXT_FOCUS_READONLY_AND_CAN_PASTE,
                group: buildGroup({
                    order: GROUP_ORDER.NAVIGATION, group: GROUP.DIPLODOC_SECTION, itemOrder: 2,
                }),
            },
            {
                command: 'diplodoc-helper.pasteImageFromClipboard',
                when: WHEN.EDITOR_TEXT_FOCUS_AND_EXTNAME_MD,
                group: buildGroup({
                    order: GROUP_ORDER.NAVIGATION, group: GROUP.DIPLODOC_SECTION, itemOrder: 3,
                }),
            },
            {
                command: 'diplodoc-helper.pasteImageFromList',
                when: WHEN.EDITOR_TEXT_FOCUS_AND_EXTNAME_MD,
                group: buildGroup({
                    order: GROUP_ORDER.NAVIGATION, group: GROUP.DIPLODOC_SECTION, itemOrder: 4,
                }),
            },
            {
                command: 'diplodoc-helper.footnote.add',
                when: WHEN.EDITOR_LANG_MD_AND_SELECTION,
                group: buildGroup({
                    order: GROUP_ORDER.NAVIGATION, group: GROUP.DIPLODOC_SECTION, itemOrder: 5,
                }),
            },
            {
                command: 'diplodoc-helper.abbr.Add',
                when: WHEN.EDITOR_LANG_YAML_MD_YAML,
                group: buildGroup({
                    order: GROUP_ORDER.NAVIGATION, group: GROUP.DIPLODOC_SECTION, itemOrder: 6,
                }),
            },
            {
                command: 'diplodoc-helper.term.Add',
                when: WHEN.EDITOR_LANG_YAML_MD_YAML,
                group: buildGroup({
                    order: GROUP_ORDER.NAVIGATION, group: GROUP.DIPLODOC_SECTION, itemOrder: 7,
                }),
            },
            {
                command: 'diplodoc-helper.gost.Insert',
                when: WHEN.EDITOR_LANG_YAML_MD_YAML,
                group: buildGroup({
                    order: GROUP_ORDER.NAVIGATION, group: GROUP.DIPLODOC_SECTION, itemOrder: 8,
                }),
            },
            {
                command: 'diplodoc-helper.yaml.format',
                when: WHEN.EDITOR_LANG_YAML_AND_SELECTION,
                group: buildGroup({
                    order: GROUP_ORDER.NAVIGATION, group: GROUP.DIPLODOC_SECTION, itemOrder: 9,
                }),
            },
            // settings — всегда доступна, в конце (BOTTOM separator → z99)
            {
                command: 'diplodoc-helper.settings',
                group: buildGroup({
                    prefix: 'z',
                    order: GROUP_ORDER.SETTINGS, group: GROUP.DIPLODOC_SECTION, itemOrder: 5,
                }),
            },
        ],
    },

    // ========================================================================
    // OTHER: подменю (context / helptag / reindex / abbr / terms / install)
    // ========================================================================
    {
        id: SUBMENU.OTHER,
        label: '%submenu.other%',
        items: [
            {
                submenu: SUBMENU.CONTEXT,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.OTHER, group: GROUP.DIPLODOC_OTHER, itemOrder: 1,
                }),
            },
            {
                submenu: SUBMENU.HELPTAG,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.OTHER, group: GROUP.DIPLODOC_OTHER, itemOrder: 2,
                }),
            },
            {
                submenu: SUBMENU.REINDEXIER,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.OTHER, group: GROUP.DIPLODOC_OTHER, itemOrder: 3,
                }),
            },
            {
                submenu: SUBMENU.ABBR,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.OTHER, group: GROUP.DIPLODOC_OTHER, itemOrder: 4,
                }),
            },
            {
                submenu: SUBMENU.TERMS,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.OTHER, group: GROUP.DIPLODOC_OTHER, itemOrder: 5,
                }),
            },
            {
                command: 'diplodoc-helper.installScripts',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.GENERATORS, group: GROUP.DIPLODOC_GENERATORS, itemOrder: 6,
                }),
            },
        ],
    },

    // ========================================================================
    // HELPTAG
    // ========================================================================
    {
        id: SUBMENU.HELPTAG,
        label: '%submenu.helptag%',
        items: [
            {
                command: 'diplodoc-helper.helptag.Update',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.HELPTAG, group: GROUP.DIPLODOC_SECTION, itemOrder: 1 }),
            },
            {
                command: 'diplodoc-helper.helptag.Delete',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.HELPTAG, group: GROUP.DIPLODOC_SECTION, itemOrder: 2 }),
            },
            {
                command: 'diplodoc-helper.generateHelpMaps',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ prefix: 'z', order: GROUP_ORDER.HELPTAG, group: GROUP.DIPLODOC_GENERATORS, itemOrder: 3 }),
            },
        ],
    },

    // ========================================================================
    // LINT
    // ========================================================================
    {
        id: SUBMENU.LINT,
        label: '%submenu.lint%',
        items: [
            {
                command: 'diplodoc-helper.linter.links',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.GENERATORS, group: GROUP.DIPLODOC_GENERATORS, itemOrder: 3 }),
            },
            {
                command: 'diplodoc-helper.linter.abbrs',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.GENERATORS, group: GROUP.DIPLODOC_GENERATORS, itemOrder: 4 }),
            },
            {
                command: 'diplodoc-helper.linter.terms',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.GENERATORS, group: GROUP.DIPLODOC_GENERATORS, itemOrder: 5 }),
            },
            {
                command: 'diplodoc-helper.wipeEmptyDirectories',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ prefix: 'z', order: GROUP_ORDER.GENERATORS, group: GROUP.DIPLODOC_FILES, itemOrder: 6 }),
            },
        ],
    },

    // ========================================================================
    // CONTEXT
    // ========================================================================
    {
        id: SUBMENU.CONTEXT,
        label: '%submenu.context%',
        items: [
            {
                command: 'diplodoc-helper.context.Update',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.CONTEXT, group: GROUP.DIPLODOC_SECTION, itemOrder: 1 }),
            },
            {
                command: 'diplodoc-helper.context.Delete',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.CONTEXT, group: GROUP.DIPLODOC_SECTION, itemOrder: 2 }),
            },
            {
                command: 'diplodoc-helper.generateContexts',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ prefix: 'z', order: GROUP_ORDER.CONTEXT, group: GROUP.DIPLODOC_GENERATORS, itemOrder: 3 }),
            },
        ],
    },

    // ========================================================================
    // REINDEX
    // ========================================================================
    {
        id: SUBMENU.REINDEXIER,
        label: '%submenu.reindexier%',
        items: [
            {
                command: 'diplodoc-helper.reindexDirectories',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.GENERATORS, group: GROUP.DIPLODOC_GENERATORS, itemOrder: 1 }),
            },
            {
                command: 'diplodoc-helper.reindexFigures',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.GENERATORS, group: GROUP.DIPLODOC_GENERATORS, itemOrder: 2 }),
            },
            {
                command: 'diplodoc-helper.reindexFootnotes',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.GENERATORS, group: GROUP.DIPLODOC_GENERATORS, itemOrder: 3 }),
            },
        ],
    },

    // ========================================================================
    // BREADCRUMBS
    // ========================================================================
    {
        id: SUBMENU.BREADCRUMBS,
        label: '%command.html.breadcrumbs%',
        items: [
            {
                command: 'diplodoc-helper.generateBreadcrumbs',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.BREADCRUMBS, group: GROUP.DIPLODOC_GENERATORS, itemOrder: 1 }),
            },
        ],
    },

    // ========================================================================
    // DEBUG
    // ========================================================================
    {
        id: SUBMENU.DEBUG,
        label: '%submenu.debug%',
        items: [
            {
                command: 'diplodoc-helper.generateContextmap',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.NAVIGATION, group: GROUP.DIPLODOC_SECTION, itemOrder: 1 }),
            },
        ],
    },

    // ========================================================================
    // ABBR
    // ========================================================================
    {
        id: SUBMENU.ABBR,
        label: '%submenu.abbrs%',
        items: [
            {
                command: 'diplodoc-helper.generateAbbrs',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.GENERATORS, group: GROUP.DIPLODOC_GENERATORS, itemOrder: 6 }),
            },
        ],
    },

    // ========================================================================
    // TERMS
    // ========================================================================
    {
        id: SUBMENU.TERMS,
        label: '%submenu.terms%',
        items: [
            {
                command: 'diplodoc-helper.generateTerms',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({ order: GROUP_ORDER.GENERATORS, group: GROUP.DIPLODOC_GENERATORS, itemOrder: 7 }),
            },
        ],
    },
];