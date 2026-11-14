// src/contrib/config/menus.ts

import {
    GROUP,
    GROUP_ORDER,
    MENU,
    SEPARATOR_ZONE,
    SUBMENU,
    WHEN,
    buildGroup,
} from './constants.ts';
import type { MenuSpec } from '../types.ts';

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
    // EXPLORER — операции над иерархией + ссылки + context/helptag + lint + прочее
    // 5 зон → 4 разделителя
    // ========================================================================
    {
        id: SUBMENU.EXPLORER,
        label: '%submenu.diplodoc%',
        items: [
            // ─── zone '' : операции с секциями ───
            {
                command: 'diplodoc-helper.createSection',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.SECTION,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 1,
                }),
            },
            {
                command: 'diplodoc-helper.smart.delete',
                when: WHEN.EXPLORER_IS_FOLDER_OR_MD_OR_IMAGES,
                group: buildGroup({
                    order: GROUP_ORDER.SECTION,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 2,
                }),
            },
            {
                command: 'diplodoc-helper.renameSection',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.SECTION,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 3,
                }),
            },
            {
                command: 'diplodoc-helper.moveSection',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.SECTION,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 4,
                }),
            },

            // ─── zone 'a' : копировать ссылку ───
            {
                command: 'diplodoc-helper.copyLink',
                when: WHEN.EXPLORER_IS_FOLDER_OR_MD_OR_IMAGES,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.ZONE_A,
                    order: GROUP_ORDER.SECTION,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 1,
                }),
            },

            // ─── zone 'b' : context + helptag (совместно, без разделителя между ними) ───
            {
                submenu: SUBMENU.CONTEXT,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.ZONE_B,
                    order: GROUP_ORDER.OTHER,
                    group: GROUP.DIPLODOC_OTHER,
                    itemOrder: 1,
                }),
            },
            {
                submenu: SUBMENU.HELPTAG,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.ZONE_B,
                    order: GROUP_ORDER.OTHER,
                    group: GROUP.DIPLODOC_OTHER,
                    itemOrder: 2,
                }),
            },

            // ─── zone 'c' : проверки и очистки ───
            {
                submenu: SUBMENU.LINT,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.ZONE_C,
                    order: GROUP_ORDER.OTHER,
                    group: GROUP.DIPLODOC_LINT,
                    itemOrder: 1,
                }),
            },

            // ─── zone 'z' : прочее ───
            {
                submenu: SUBMENU.OTHER,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.AFTER_ALL,
                    order: GROUP_ORDER.OTHER,
                    group: GROUP.DIPLODOC_OTHER,
                    itemOrder: 1,
                }),
            },
        ],
    },

    // ========================================================================
    // EDITOR — вставки + текстовые вставки + yaml.format + настройки
    // 4 зоны → 3 разделителя (в .md всё видно; в .yaml зона '' и 'z' пустые)
    // ========================================================================
    {
        id: SUBMENU.EDITOR,
        label: '%submenu.diplodoc%',
        items: [
            // ─── zone '' : вставки в .md ───
            {
                command: 'diplodoc-helper.pasteImageFromClipboard',
                when: WHEN.EDITOR_TEXT_FOCUS_AND_EXTNAME_MD,
                group: buildGroup({
                    order: GROUP_ORDER.NAVIGATION,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 1,
                }),
            },
            {
                command: 'diplodoc-helper.pasteImageFromList',
                when: WHEN.EDITOR_TEXT_FOCUS_AND_EXTNAME_MD,
                group: buildGroup({
                    order: GROUP_ORDER.NAVIGATION,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 2,
                }),
            },
            {
                command: 'diplodoc-helper.pasteLink',
                when: WHEN.EDITOR_TEXT_FOCUS_READONLY_AND_CAN_PASTE,
                group: buildGroup({
                    order: GROUP_ORDER.NAVIGATION,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 3,
                }),
            },

            // ─── zone 'a' : сокращения / термины / ГОСТы (md + yaml) ───
            {
                command: 'diplodoc-helper.abbr.Add',
                when: WHEN.EDITOR_LANG_YAML_MD_YAML,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.ZONE_A,
                    order: GROUP_ORDER.NAVIGATION,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 1,
                }),
            },
            {
                command: 'diplodoc-helper.term.Add',
                when: WHEN.EDITOR_LANG_YAML_MD_YAML,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.ZONE_A,
                    order: GROUP_ORDER.NAVIGATION,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 2,
                }),
            },
            {
                command: 'diplodoc-helper.gost.Insert',
                when: WHEN.EDITOR_LANG_YAML_MD_YAML,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.ZONE_A,
                    order: GROUP_ORDER.NAVIGATION,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 3,
                }),
            },

            // ─── zone 'b' : форматирование выделения (yaml + selection) ───
            {
                command: 'diplodoc-helper.yaml.format',
                when: WHEN.EDITOR_LANG_YAML_AND_SELECTION,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.ZONE_B,
                    order: GROUP_ORDER.NAVIGATION,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 1,
                }),
            },

            // ─── zone 'z' : настройки (md-only) ───
            {
                command: 'diplodoc-helper.settings',
                when: WHEN.EDITOR_LANG_MD,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.AFTER_ALL,
                    order: GROUP_ORDER.SETTINGS,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 5,
                }),
            },
        ],
    },

    // ========================================================================
    // CONTEXT — 2 зоны → 1 разделитель
    // ========================================================================
    {
        id: SUBMENU.CONTEXT,
        label: '%submenu.context%',
        items: [
            {
                command: 'diplodoc-helper.context.Update',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.CONTEXT,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 1,
                }),
            },
            {
                command: 'diplodoc-helper.context.Delete',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.CONTEXT,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 2,
                }),
            },
            {
                command: 'diplodoc-helper.generateContexts',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.AFTER_ALL,
                    order: GROUP_ORDER.CONTEXT,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 3,
                }),
            },
        ],
    },

    // ========================================================================
    // HELPTAG — 2 зоны → 1 разделитель
    // ========================================================================
    {
        id: SUBMENU.HELPTAG,
        label: '%submenu.helptag%',
        items: [
            {
                command: 'diplodoc-helper.helptag.Update',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.HELPTAG,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 1,
                }),
            },
            {
                command: 'diplodoc-helper.helptag.Delete',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.HELPTAG,
                    group: GROUP.DIPLODOC_SECTION,
                    itemOrder: 2,
                }),
            },
            {
                command: 'diplodoc-helper.generateHelpMaps',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.AFTER_ALL,
                    order: GROUP_ORDER.HELPTAG,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 3,
                }),
            },
        ],
    },

    // ========================================================================
    // LINT — проверки и очистки (2 зоны → 1 разделитель)
    // ========================================================================
    {
        id: SUBMENU.LINT,
        label: '%submenu.lint%',
        items: [
            {
                command: 'diplodoc-helper.linter.links',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.GENERATORS,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 1,
                }),
            },
            {
                command: 'diplodoc-helper.wipeEmptyDirectories',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.AFTER_ALL,
                    order: GROUP_ORDER.GENERATORS,
                    group: GROUP.DIPLODOC_FILES,
                    itemOrder: 1,
                }),
            },
        ],
    },

    // ========================================================================
    // REINDEXIER — 1 зона → 0 разделителей
    // ========================================================================
    {
        id: SUBMENU.REINDEXIER,
        label: '%submenu.reindexier%',
        items: [
            {
                command: 'diplodoc-helper.reindexDirectories',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.GENERATORS,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 1,
                }),
            },
            {
                command: 'diplodoc-helper.reindexFigures',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.GENERATORS,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 2,
                }),
            },
            {
                command: 'diplodoc-helper.reindexFootnotes',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.GENERATORS,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 3,
                }),
            },
        ],
    },

    // ========================================================================
    // ABBR — всё про сокращения (сборка + проверка)
    // ========================================================================
    {
        id: SUBMENU.ABBR,
        label: '%submenu.abbrs%',
        items: [
            {
                command: 'diplodoc-helper.generateAbbrs',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.GENERATORS,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 1,
                }),
            },
            {
                command: 'diplodoc-helper.linter.abbrs',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.GENERATORS,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 2,
                }),
            },
        ],
    },

    // ========================================================================
    // TERMS — всё про термины (сборка + проверка)
    // ========================================================================
    {
        id: SUBMENU.TERMS,
        label: '%submenu.terms%',
        items: [
            {
                command: 'diplodoc-helper.generateTerms',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.GENERATORS,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 1,
                }),
            },
            {
                command: 'diplodoc-helper.linter.terms',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.GENERATORS,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 2,
                }),
            },
        ],
    },

    // ========================================================================
    // OTHER — переиндексация + хлебные крошки + карта контекстов + install
    // 3 зоны → 2 разделителя
    // ========================================================================
    {
        id: SUBMENU.OTHER,
        label: '%submenu.other%',
        items: [
            // ─── zone '' : переиндексация ───
            {
                submenu: SUBMENU.REINDEXIER,
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    order: GROUP_ORDER.OTHER,
                    group: GROUP.DIPLODOC_OTHER,
                    itemOrder: 1,
                }),
            },

            // ─── zone 'a' : сгенерировать артефакты ───
            {
                command: 'diplodoc-helper.generateBreadcrumbs',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.ZONE_A,
                    order: GROUP_ORDER.BREADCRUMBS,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 1,
                }),
            },
            {
                command: 'diplodoc-helper.generateContextmap',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.ZONE_A,
                    order: GROUP_ORDER.BREADCRUMBS,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 2,
                }),
            },

            // ─── zone 'z' : установка ───
            {
                command: 'diplodoc-helper.installScripts',
                when: WHEN.EXPLORER_IS_FOLDER,
                group: buildGroup({
                    prefix: SEPARATOR_ZONE.AFTER_ALL,
                    order: GROUP_ORDER.GENERATORS,
                    group: GROUP.DIPLODOC_GENERATORS,
                    itemOrder: 1,
                }),
            },
        ],
    },
];