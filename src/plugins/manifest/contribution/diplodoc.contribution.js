// src/manifest/contributesModel.js

const ManifestCommand = require('../../manifest.builder/contribution/model/ContributionCommand');
const ManifestSubmenu = require('../../manifest.builder/contribution/model/ContributionSubmenu');
const ManifestMenuItem = require('../../manifest.builder/contribution/model/ContributionMenuItem');
const ManifestMenu = require('../../manifest.builder/contribution/model/ContributionMenu');
const SeparatorPosition = require('../../manifest.builder/contribution/model/ContributionMenuSeparatorPosition');

const { menuItem, submenuItem } = require('../../manifest.builder/contribution/model');

const GROUP_ORDER = {
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
};
const GROUP = {
    DIPLODOC_SECTION: 'diplodoc.section',
    DIPLODOC_COPY: 'diplodoc.copy',
    DIPLODOC_CONTEXT: 'diplodoc.context',
    DIPLODOC_HELPTAG: 'diplodoc.helptag',
    DIPLODOC_GENERATORS: 'diplodoc.generators',
    DIPLODOC_FILES: 'diplodoc.files',
    NAVIGATION: 'diplodoc.navigation',
    DIPLODOC_MENU: 'diplodoc.menu',
    DIPLODOC_OTHER: 'diplodoc.other',
    DIPLODOC_LINT: 'diplodoc.lint',
    DIPLODOC_DEBUG: 'diplodoc.debug',
};
const SUBMENU = {
    EXPLORER: 'diplodoc.explorer.context.menu',
    EDITOR: 'diplodoc.editor.context.menu',
    HELPTAG: 'diplodoc.helptag.explorer.context.menu',
    CONTEXT: 'diplodoc.context.explorer.context.menu',
    OTHER: 'diplodoc.other.explorer.context.menu',
    REINDEXIER: 'diplodoc.reindexier.explorer.context.menu',
    BREADCRUMBS: 'diplodoc.breadcrumbs.explorer.context.menu',
    DEBUG: 'diplodoc.debug.explorer.context.menu',
    CONTEXTMAP: 'diplodoc.contextmap.explorer.context.menu',
    LINT: 'diplodoc.lint.explorer.context.menu',
    ABBR: 'diplodoc.abbrs.explorer.context.menu',
    TERMS: 'diplodoc.terms.explorer.context.menu',
};
const MENU = {
    EDITOR_CONTEXT: 'editor/context',
    EXPLORER_CONTEXT: 'explorer/context',
};

const WHEN = {
    EXPLORER_IS_FOLDER: 'explorerResourceIsFolder',
    EXPLORER_IS_FOLDER_OR_MD_OR_IMAGES:
        'explorerResourceIsFolder || resourceExtname == .md || resourceExtname == .png || resourceExtname == .jpg || resourceExtname == .svg',
    EXPLORER_IS_FOLDER_OR_NOT_MD: 'explorerResourceIsFolder || resourceExtname != .md',
    EDITOR_LANG_MD_AND_SELECTION: 'editorLangId == markdown && editorHasSelection',
    EDITOR_TEXT_FOCUS_READONLY_AND_CAN_PASTE:
        'editorTextFocus && !editorReadonly && (diplodoc-helper:canPasteMarkdownLink || resourceFilename =~ /^(gosts|abbreviations)\\.yaml$/)',
    EDITOR_TEXT_FOCUS_AND_EXTNAME_MD: 'editorTextFocus && resourceExtname == .md',
    EDITOR_TEXT_FOCUS_AND_NOT_READONLY: 'editorTextFocus && !editorReadonly',
};

const explorerSubmenu = new ManifestSubmenu(SUBMENU.EXPLORER, '%submenu.diplodoc%');

explorerSubmenu
    .addItem(
        menuItem(
            'diplodoc-helper.createSection',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.SECTION,
            1
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.smart.delete',
            WHEN.EXPLORER_IS_FOLDER_OR_MD_OR_IMAGES,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.SECTION,
            2
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.renameSection',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.SECTION,
            3
        )
    )
    .addItem(
        menuItem('diplodoc-helper.moveSection', WHEN.EXPLORER_IS_FOLDER, GROUP.DIPLODOC_SECTION, GROUP_ORDER.SECTION, 4)
    )
    .addItem(
        menuItem(
            'diplodoc-helper.copyLink',
            WHEN.EXPLORER_IS_FOLDER_OR_MD_OR_IMAGES,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.SECTION,
            5,
            SeparatorPosition.BOTTOM
        )
    )
    .addItem(
        submenuItem(
            SUBMENU.OTHER,
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_OTHER,
            GROUP_ORDER.OTHER,
            1,
            SeparatorPosition.BOTTOM
        )
    )
    .addItem(
        submenuItem(
            SUBMENU.LINT,
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_LINT,
            GROUP_ORDER.OTHER,
            2,
            SeparatorPosition.BOTTOM
        )
    )
    .addItem(
        submenuItem(
            SUBMENU.DEBUG,
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_DEBUG,
            GROUP_ORDER.OTHER,
            3,
            SeparatorPosition.BOTTOM
        )
    );

const editorSubmenu = new ManifestSubmenu(SUBMENU.EDITOR, '%submenu.diplodoc%');

editorSubmenu
    .addItem(
        menuItem(
            'diplodoc-helper.link.addAnchor',
            WHEN.EDITOR_LANG_MD_AND_SELECTION,
            GROUP.DIPLODOC_SECTION, GROUP_ORDER.NAVIGATION,
            1
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.pasteLink',
            WHEN.EDITOR_TEXT_FOCUS_READONLY_AND_CAN_PASTE,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.NAVIGATION,
            2
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.pasteImageFromClipboard',
            WHEN.EDITOR_TEXT_FOCUS_AND_EXTNAME_MD,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.NAVIGATION,
            3
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.pasteImageFromList',
            WHEN.EDITOR_TEXT_FOCUS_AND_EXTNAME_MD,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.NAVIGATION,
            4
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.settings',
            undefined,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.SETTINGS,
            5,
            SeparatorPosition.BOTTOM
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.footnote.add',
            WHEN.EDITOR_LANG_MD_AND_SELECTION,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.NAVIGATION,
            5,
            SeparatorPosition.NONE
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.abbr.Add',
            WHEN.EDITOR_LANG_MD_AND_SELECTION,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.NAVIGATION,
            6
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.term.Add',
            WHEN.EDITOR_LANG_MD_AND_SELECTION,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.NAVIGATION,
            7
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.gost.Insert',
            WHEN.EDITOR_TEXT_FOCUS_AND_NOT_READONLY,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.NAVIGATION,
            8 // Следующий порядковый номер
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.gost.Add',
            WHEN.EDITOR_TEXT_FOCUS_AND_NOT_READONLY,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.NAVIGATION,
            9
        )
    );
const otherSubmenu = new ManifestSubmenu(SUBMENU.OTHER, '%submenu.other%');

otherSubmenu
    .addItem(submenuItem(SUBMENU.CONTEXT, WHEN.EXPLORER_IS_FOLDER, GROUP.DIPLODOC_OTHER, GROUP_ORDER.OTHER, 1))
    .addItem(submenuItem(SUBMENU.HELPTAG, WHEN.EXPLORER_IS_FOLDER, GROUP.DIPLODOC_OTHER, GROUP_ORDER.OTHER, 2))
    .addItem(submenuItem(SUBMENU.REINDEXIER, WHEN.EXPLORER_IS_FOLDER, GROUP.DIPLODOC_OTHER, GROUP_ORDER.OTHER, 3))
    .addItem(submenuItem(SUBMENU.ABBR, WHEN.EXPLORER_IS_FOLDER, GROUP.DIPLODOC_OTHER, GROUP_ORDER.OTHER, 4))
    .addItem(submenuItem(SUBMENU.TERMS, WHEN.EXPLORER_IS_FOLDER, GROUP.DIPLODOC_OTHER, GROUP_ORDER.OTHER, 5))
    .addItem(menuItem('diplodoc-helper.installScripts', WHEN.EXPLORER_IS_FOLDER, GROUP.DIPLODOC_GENERATORS, GROUP_ORDER.GENERATORS, 6));

const debugSubmenu = new ManifestSubmenu(SUBMENU.DEBUG, '%submenu.debug%');

debugSubmenu.addItem(
    menuItem(
        'diplodoc-helper.generateContextmap',
        WHEN.EXPLORER_IS_FOLDER,
        GROUP.DIPLODOC_SECTION,
        GROUP_ORDER.NAVIGATION,
        1
    )
);

const lintSubmenu = new ManifestSubmenu(SUBMENU.LINT, '%submenu.lint%');

lintSubmenu
    .addItem(
        menuItem(
            'diplodoc-helper.linter.links',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_GENERATORS,
            GROUP_ORDER.GENERATORS,
            3
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.linter.abbrs',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_GENERATORS,
            GROUP_ORDER.GENERATORS,
            4
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.linter.terms',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_GENERATORS,
            GROUP_ORDER.GENERATORS,
            5
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.wipeEmptyDirectories',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_FILES,
            GROUP_ORDER.GENERATORS,
            6,
            SeparatorPosition.BOTTOM
        )
    );

const abbrsSubmenu = new ManifestSubmenu(SUBMENU.ABBR, '%submenu.abbrs%');

abbrsSubmenu.addItem(
    menuItem(
        'diplodoc-helper.generateAbbrs',
        WHEN.EXPLORER_IS_FOLDER,
        GROUP.DIPLODOC_GENERATORS,
        GROUP_ORDER.GENERATORS,
        6
    )
);

const termsSubmenu = new ManifestSubmenu(SUBMENU.TERMS, '%submenu.terms%');

termsSubmenu.addItem(
    menuItem(
        'diplodoc-helper.generateTerms',
        WHEN.EXPLORER_IS_FOLDER,
        GROUP.DIPLODOC_GENERATORS,
        GROUP_ORDER.GENERATORS,
        7
    )
);

const helptagSubmenu = new ManifestSubmenu(SUBMENU.HELPTAG, '%submenu.helptag%');

helptagSubmenu
    .addItem(
        menuItem(
            'diplodoc-helper.helptag.Update',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.HELPTAG,
            1
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.helptag.Delete',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.HELPTAG,
            2
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.generateHelpMaps',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_GENERATORS,
            GROUP_ORDER.HELPTAG,
            3,
            SeparatorPosition.BOTTOM
        )
    );

const contextSubmenu = new ManifestSubmenu(SUBMENU.CONTEXT, '%submenu.context%');

contextSubmenu
    .addItem(
        menuItem(
            'diplodoc-helper.context.Update',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.CONTEXT,
            1
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.context.Delete',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_SECTION,
            GROUP_ORDER.CONTEXT,
            2
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.generateContexts',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_GENERATORS,
            GROUP_ORDER.CONTEXT,
            3,
            SeparatorPosition.BOTTOM
        )
    );

const reindexierSubmenu = new ManifestSubmenu(SUBMENU.REINDEXIER, '%submenu.reindexier%');

reindexierSubmenu
    .addItem(
        menuItem(
            'diplodoc-helper.reindexDirectories',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_GENERATORS,
            GROUP_ORDER.GENERATORS,
            1
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.reindexFigures',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_GENERATORS,
            GROUP_ORDER.GENERATORS,
            2
        )
    )
    .addItem(
        menuItem(
            'diplodoc-helper.reindexFootnotes',
            WHEN.EXPLORER_IS_FOLDER,
            GROUP.DIPLODOC_GENERATORS,
            GROUP_ORDER.GENERATORS,
            3
        )
    );

const breadcrumbsSubmenu = new ManifestSubmenu(SUBMENU.BREADCRUMBS, '%command.html.breadcrumbs%');

breadcrumbsSubmenu.addItem(
    menuItem(
        'diplodoc-helper.generateBreadcrumbs',
        WHEN.EXPLORER_IS_FOLDER,
        GROUP.DIPLODOC_GENERATORS,
        GROUP_ORDER.BREADCRUMBS,
        1
    )
);

const editorRootMenu = new ManifestMenu(MENU.EDITOR_CONTEXT);

editorRootMenu.addItem(
    new ManifestMenuItem({
        submenu: editorSubmenu.id,
        when: WHEN.EDITOR_TEXT_FOCUS_AND_NOT_READONLY,
        groupName: GROUP.DIPLODOC_MENU,
        groupOrder: GROUP_ORDER.MENU,
        order: 1,
    })
);

const explorerRootMenu = new ManifestMenu(MENU.EXPLORER_CONTEXT);

explorerRootMenu.addItem(
    new ManifestMenuItem({
        submenu: explorerSubmenu.id,
        groupName: GROUP.DIPLODOC_MENU,
        groupOrder: GROUP_ORDER.MENU,
        order: 1,
    })
);

const rootMenus = [editorRootMenu, explorerRootMenu];
const allSubmenus = [
    explorerSubmenu,
    editorSubmenu,
    otherSubmenu,
    helptagSubmenu,
    lintSubmenu,
    contextSubmenu,
    reindexierSubmenu,
    breadcrumbsSubmenu,
    debugSubmenu,
    abbrsSubmenu,
    termsSubmenu,
];

const commands = [
    new ManifestCommand('diplodoc-helper.link.addAnchor', '%command.md.anchor.add%'),
    new ManifestCommand('diplodoc-helper.createSection', '%command.md.section.create%'),
    new ManifestCommand('diplodoc-helper.deleteSection', '%command.md.section.delete%'),
    new ManifestCommand('diplodoc-helper.linter.links', '%command.linter.links.check%'),
    new ManifestCommand('diplodoc-helper.renameSection', '%command.md.section.update%'),
    new ManifestCommand('diplodoc-helper.moveSection', '%command.md.section.move%'),
    new ManifestCommand('diplodoc-helper.reindexDirectories', '%command.fs.naming.update%'),
    new ManifestCommand('diplodoc-helper.reindexFigures', '%command.md.link.rebuild%'),
    new ManifestCommand('diplodoc-helper.copyLink', '%command.md.link.copy%'),
    new ManifestCommand('diplodoc-helper.file.delete', '%command.file.delete.wipe_references%'),
    new ManifestCommand('diplodoc-helper.pasteLink', '%command.md.link.paste.fromClipboard%'),
    new ManifestCommand('diplodoc-helper.pasteImageFromList', '%command.md.link.paste.fromList%'),
    new ManifestCommand('diplodoc-helper.pasteImageFromClipboard', '%command.md.image.paste%'),
    new ManifestCommand('diplodoc-helper.generateContexts', '%command.fe.context.generate%'),
    new ManifestCommand('diplodoc-helper.wipeEmptyDirectories', '%command.fs.empty.wipe%'),
    new ManifestCommand('diplodoc-helper.generateHelpMaps', '%command.fe.helptag.generate%'),
    new ManifestCommand('diplodoc-helper.generateBreadcrumbs', '%command.html.breadcrumbs.generate%'),
    new ManifestCommand('diplodoc-helper.helptag.Update', '%command.md.helptag.update%'),
    new ManifestCommand('diplodoc-helper.helptag.Delete', '%command.md.helptag.delete%'),
    new ManifestCommand('diplodoc-helper.context.Update', '%command.md.context.update%'),
    new ManifestCommand('diplodoc-helper.context.Delete', '%command.md.context.delete%'),
    new ManifestCommand('diplodoc-helper.settings', '%command.settings%'),
    new ManifestCommand('diplodoc-helper.smart.delete', '%command.smart.delete%'),
    new ManifestCommand('diplodoc-helper.generateContextmap', 'diplodoc-helper.generateContextmap'),
    new ManifestCommand('diplodoc-helper.footnote.add', '%command.md.footnote.add%'),
    new ManifestCommand('diplodoc-helper.reindexFootnotes', '%command.md.footnote.reindex%'),
    new ManifestCommand('diplodoc-helper.generateAbbrs', '%command.fe.abbrs.generate%'),
    new ManifestCommand('diplodoc-helper.abbr.Add', '%command.md.abbr.add%'),
    new ManifestCommand('diplodoc-helper.linter.abbrs', '%command.linter.abbrs.check%'),
    new ManifestCommand('diplodoc-helper.generateTerms', '%command.fe.terms.generate%'),
    new ManifestCommand('diplodoc-helper.term.Add', '%command.md.term.add%'),
    new ManifestCommand('diplodoc-helper.linter.terms', '%command.linter.terms.check%'),
    new ManifestCommand('diplodoc-helper.installScripts', 'Установить скрипты сборки'),
    new ManifestCommand('diplodoc-helper.gost.Insert', 'Вставить из списка ГОСТ'),
    new ManifestCommand('diplodoc-helper.gost.Add', 'Добавить ГОСТ'),
];

module.exports = { commands, rootMenus, allSubmenus };
