const vscode = require('vscode');
const { CONFIG_KEY } = require('../plugins/manifest/constants');

// Импортируем все обработчики
const { ux_breadcrumbs_generate } = require('./diplodoc-helper.breadCrumb.Generate');
const { ux_contextmap_generate } = require('./diplodoc-helper.contextmap.Generate');
const { ux_context_delete } = require('./diplodoc-helper.context.Delete');
const { ux_context_update } = require('./diplodoc-helper.context.Update');
const { ux_context_run_generation } = require('./diplodoc-helper.context.Generate');
const { ux_directories_wipe } = require('./diplodoc-helper.context.WipeEmptyDirectories');
const { ux_helpmap_generate } = require('./diplodoc-helper.helpMap.Generate');
const { ux_helptag_delete } = require('./diplodoc-helper.helptag.Delete');
const { ux_helptag_update } = require('./diplodoc-helper.helptag.Update');
const { ux_image_paste_clipboard } = require('./diplodoc-helper.image.PasteFromClipboard');
const { ux_image_paste_list } = require('./diplodoc-helper.image.PasteFromList');
const { ux_link_copy } = require('./diplodoc-helper.link.Copy');
const { ux_link_paste } = require('./diplodoc-helper.link.Paste');
const { ux_reindex_directories } = require('./diplodoc-helper.reindex.directories');
const { ux_reindex_figures } = require('./diplodoc-helper.reindex.figures');
const { ux_section_create } = require('./diplodoc-helper.section.Create');
const { ux_section_delete } = require('./diplodoc-helper.section.Delete');
const { ux_section_move } = require('./diplodoc-helper.section.Move');
const { ux_section_rename } = require('./diplodoc-helper.section.Rename');
const { ux_file_delete } = require('./diplodoc-helper.file.Delete');
const { ux_add_anchor } = require('./diplodoc-helper.link.AddAnchor');
const { ux_linter_links } = require('./diplodoc-helper.linter.links');
const { pickAndReplace } = require('./vscode.linter.links.picker');
const { ux_smart_delete } = require('./diplodoc-helper.smart.delete');
const { ux_footnote_add } = require('./diplodoc-helper.footnote.Add');
const { ux_reindex_footnotes } = require('./diplodoc-helper.footnote.Reindex');
const { ux_abbrs_generate } = require('./diplodoc-helper.abbr.Generate');
const { ux_abbr_add, ux_abbr_show_full } = require('./diplodoc-helper.abbr.Add');
const { ux_linter_abbrs } = require('./diplodoc-helper.linter.abbrs');
const { ux_term_add, ux_term_show_full } = require('./diplodoc-helper.term.Add');
const { ux_terms_generate } = require('./diplodoc-helper.term.Generate');
const { ux_linter_terms } = require('./diplodoc-helper.linter.terms');
const {ux_install_scripts} = require('./diplodoc-helper.installScripts');
const { ux_gost_add } = require('./diplodoc-helper.gost.Add');
const { ux_gost_insert } = require('./diplodoc-helper.gost.Insert');

/**
 * Реестр всех команд расширения.
 * Ключ – полное имя команды (строка), значение – функция-обработчик.
 */
const commandHandlers = {
    'diplodoc-helper.createSection': ux_section_create,
    'diplodoc-helper.deleteSection': ux_section_delete,
    'diplodoc-helper.renameSection': ux_section_rename,
    'diplodoc-helper.moveSection': ux_section_move,
    'diplodoc-helper.context.Update': ux_context_update,
    'diplodoc-helper.context.Delete': ux_context_delete,
    'diplodoc-helper.copyLink': ux_link_copy,
    'diplodoc-helper.pasteLink': ux_link_paste,
    'diplodoc-helper.pasteImageFromClipboard': ux_image_paste_clipboard,
    'diplodoc-helper.pasteImageFromList': ux_image_paste_list,
    'diplodoc-helper.generateContexts': ux_context_run_generation,
    'diplodoc-helper.generateHelpMaps': ux_helpmap_generate,
    'diplodoc-helper.generateBreadcrumbs': ux_breadcrumbs_generate,
    'diplodoc-helper.generateContextmap': ux_contextmap_generate,
    'diplodoc-helper.reindexDirectories': ux_reindex_directories,
    'diplodoc-helper.reindexFigures': ux_reindex_figures,
    'diplodoc-helper.wipeEmptyDirectories': ux_directories_wipe,
    'diplodoc-helper.helptag.Update': ux_helptag_update,
    'diplodoc-helper.helptag.Delete': ux_helptag_delete,
    'diplodoc-helper.link.addAnchor': ux_add_anchor,
    'diplodoc-helper.file.delete': ux_file_delete,
    'diplodoc-helper.smart.delete': ux_smart_delete,
    'diplodoc-helper.linter.links': ux_linter_links,
    'diplodoc-helper.footnote.add': ux_footnote_add,
    'diplodoc-helper.reindexFootnotes': ux_reindex_footnotes,
    'diplodoc-helper.generateAbbrs': ux_abbrs_generate,
    'diplodoc-helper.abbr.Add': ux_abbr_add,
    'diplodoc-helper.abbr.showFull': ux_abbr_show_full,
    'diplodoc-helper.linter.abbrs': ux_linter_abbrs,
    'diplodoc-helper.generateTerms': ux_terms_generate,
    'diplodoc-helper.term.Add': ux_term_add,
    'diplodoc-helper.term.showFull': ux_term_show_full,
    'diplodoc-helper.linter.terms': ux_linter_terms,
    'diplodoc-helper.installScripts':ux_install_scripts,
    'diplodoc-helper.gost.Add': ux_gost_add,
    'diplodoc-helper.gost.Insert': ux_gost_insert,
    'diplodoc-helper.settings': () => {
        vscode.commands.executeCommand('workbench.action.openSettings', CONFIG_KEY);
    },
    // Внутренняя команда, не отображаемая в меню
    'ux-linter.pickAndReplace': pickAndReplace,
};

module.exports = { commandHandlers };
