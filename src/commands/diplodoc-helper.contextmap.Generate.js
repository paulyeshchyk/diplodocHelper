const { runGeneration } = require('../plugins/contentNavigator/generateNavigationContent.js');
const path = require('path');
const vscode = require('vscode');

const BuildFolderName = 'build';
const DocsFolderName = 'docs';

async function ux_contextmap_generate() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const BUILD_ROOT = path.join(projectRoot, BuildFolderName).replace(/\\/g, '/');
    const DOCS_DIR = path.join(projectRoot, DocsFolderName).replace(/\\/g, '/');
    // "core-renderer.js",
    // "core-style.css",
    // "bytescounter.css",
    // "bytescounter.js",
    // "contextmap.css",
    // "contextmap.js",
    // "helptagmap.css",
    // "helptagmap.js",
    // "page-template.html",

    // await export_template(vscode.Uri.file(path.join(__dirname, '../src/plugins/contentNavigator/page-template.html')));
    // await export_template(vscode.Uri.file(path.join(__dirname, '../src/plugins/contentNavigator/core-renderer.js')));
    // await export_template(vscode.Uri.file(path.join(__dirname, '../src/plugins/contentNavigator/core-style.css')));
    // await export_template(vscode.Uri.file(path.join(__dirname, '../src/plugins/contentNavigator/bytescounter.css')));
    // await export_template(vscode.Uri.file(path.join(__dirname, '../src/plugins/contentNavigator/bytescounter.js')));
    // await export_template(vscode.Uri.file(path.join(__dirname, '../src/plugins/contentNavigator/contextmap.css')));
    // await export_template(vscode.Uri.file(path.join(__dirname, '../src/plugins/contentNavigator/contextmap.js')));
    // await export_template(vscode.Uri.file(path.join(__dirname, '../src/plugins/contentNavigator/helptagmap.css')));
    // await export_template(vscode.Uri.file(path.join(__dirname, '../src/plugins/contentNavigator/helptagmap.js')));

    const periodicConfig = { mapDir: BUILD_ROOT, outputDir: BUILD_ROOT, command: 'periodicTable', docsDir: DOCS_DIR };
    runGeneration(periodicConfig);

    const contextConfig = {
        mapDir: BUILD_ROOT,
        outputDir: BUILD_ROOT,
        command: 'periodicTableContext',
        docsDir: DOCS_DIR,
    };
    runGeneration(contextConfig);

    const helptagConfig = {
        mapDir: BUILD_ROOT,
        outputDir: BUILD_ROOT,
        command: 'periodicTableHelpTag',
        docsDir: DOCS_DIR,
    };
    runGeneration(helptagConfig);
}

/**
 * @param {vscode.Uri} template_path
 */
async function export_template(template_path) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;
    const projectRoot = workspaceFolders[0].uri.fsPath;
    const BUILD_ROOT = path.join(projectRoot, BuildFolderName).replace(/\\/g, '/');

    // --- ЭКСПОРТ ШАБЛОНА ---
    try {
        const targetUri = vscode.Uri.file(path.join(BUILD_ROOT, 'page-template.html'));

        await vscode.workspace.fs.createDirectory(vscode.Uri.file(BUILD_ROOT));

        await vscode.workspace.fs.copy(template_path, targetUri, { overwrite: true });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Ошибка при экспорте шаблона: ${msg}`);
        return; // Прерываем выполнение, если шаблон не скопировался
    }
}

module.exports = { ux_contextmap_generate, runGeneration };
