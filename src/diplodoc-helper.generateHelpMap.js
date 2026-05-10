const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const vscode = require("vscode");



// Проверка наличия vscode
/**
 * @typedef {Object} HelpEntry
 * @property {string} url - Относительный путь к файлу без расширения
 * @property {string} title - Заголовок статьи
 * @property {string} hint - Подсказка из метаданных
 * @property {string} context - Значение тега helptag
 * @property {string} lang - Языковой код (ru, en и т.д.)
 * @typedef {Object} GenerationResults
 * @property {HelpEntry[]} success - Успешно обработанные записи
 * @property {string[]} failed - Пути к файлам, вызвавшим ошибку
 * @type {{ workspace: any; window: any; version?: string; Position?: typeof import("vscode").Position; Range?: typeof import("vscode").Range; Selection?: typeof import("vscode").Selection; TextEditorSelectionChangeKind?: typeof import("vscode").TextEditorSelectionChangeKind; TextEditorCursorStyle?: typeof import("vscode").TextEditorCursorStyle; TextEditorLineNumbersStyle?: typeof import("vscode").TextEditorLineNumbersStyle; TextEditorRevealType?: typeof import("vscode").TextEditorRevealType; OverviewRulerLane?: typeof import("vscode").OverviewRulerLane; DecorationRangeBehavior?: typeof import("vscode").DecorationRangeBehavior; ThemeColor?: typeof import("vscode").ThemeColor; ThemeIcon?: typeof import("vscode").ThemeIcon; EndOfLine?: typeof import("vscode").EndOfLine; Uri?: typeof import("vscode").Uri; CancellationTokenSource?: typeof import("vscode").CancellationTokenSource; CancellationError?: typeof import("vscode").CancellationError; Disposable?: typeof import("vscode").Disposable; EventEmitter?: typeof import("vscode").EventEmitter; QuickPickItemKind?: typeof import("vscode").QuickPickItemKind; InputBoxValidationSeverity?: typeof import("vscode").InputBoxValidationSeverity; RelativePattern?: typeof import("vscode").RelativePattern; CodeActionKind?: typeof import("vscode").CodeActionKind; CodeActionTriggerKind?: typeof import("vscode").CodeActionTriggerKind; CodeAction?: typeof import("vscode").CodeAction; CodeLens?: typeof import("vscode").CodeLens; MarkdownString?: typeof import("vscode").MarkdownString; Hover?: typeof import("vscode").Hover; EvaluatableExpression?: typeof import("vscode").EvaluatableExpression; InlineValueText?: typeof import("vscode").InlineValueText; InlineValueVariableLookup?: typeof import("vscode").InlineValueVariableLookup; InlineValueEvaluatableExpression?: typeof import("vscode").InlineValueEvaluatableExpression; DocumentHighlightKind?: typeof import("vscode").DocumentHighlightKind; DocumentHighlight?: typeof import("vscode").DocumentHighlight; SymbolKind?: typeof import("vscode").SymbolKind; SymbolTag?: typeof import("vscode").SymbolTag; SymbolInformation?: typeof import("vscode").SymbolInformation; DocumentSymbol?: typeof import("vscode").DocumentSymbol; TextEdit?: typeof import("vscode").TextEdit; SnippetTextEdit?: typeof import("vscode").SnippetTextEdit; NotebookEdit?: typeof import("vscode").NotebookEdit; WorkspaceEdit?: typeof import("vscode").WorkspaceEdit; SnippetString?: typeof import("vscode").SnippetString; SemanticTokensLegend?: typeof import("vscode").SemanticTokensLegend; SemanticTokensBuilder?: typeof import("vscode").SemanticTokensBuilder; SemanticTokens?: typeof import("vscode").SemanticTokens; SemanticTokensEdits?: typeof import("vscode").SemanticTokensEdits; SemanticTokensEdit?: typeof import("vscode").SemanticTokensEdit; ParameterInformation?: typeof import("vscode").ParameterInformation; SignatureInformation?: typeof import("vscode").SignatureInformation; SignatureHelp?: typeof import("vscode").SignatureHelp; SignatureHelpTriggerKind?: typeof import("vscode").SignatureHelpTriggerKind; CompletionItemKind?: typeof import("vscode").CompletionItemKind; CompletionItemTag?: typeof import("vscode").CompletionItemTag; CompletionItem?: typeof import("vscode").CompletionItem; CompletionList?: typeof import("vscode").CompletionList; CompletionTriggerKind?: typeof import("vscode").CompletionTriggerKind; InlineCompletionList?: typeof import("vscode").InlineCompletionList; InlineCompletionTriggerKind?: typeof import("vscode").InlineCompletionTriggerKind; InlineCompletionItem?: typeof import("vscode").InlineCompletionItem; DocumentLink?: typeof import("vscode").DocumentLink; Color?: typeof import("vscode").Color; ColorInformation?: typeof import("vscode").ColorInformation; ColorPresentation?: typeof import("vscode").ColorPresentation; InlayHintKind?: typeof import("vscode").InlayHintKind; InlayHintLabelPart?: typeof import("vscode").InlayHintLabelPart; InlayHint?: typeof import("vscode").InlayHint; FoldingRange?: typeof import("vscode").FoldingRange; FoldingRangeKind?: typeof import("vscode").FoldingRangeKind; SelectionRange?: typeof import("vscode").SelectionRange; CallHierarchyItem?: typeof import("vscode").CallHierarchyItem; CallHierarchyIncomingCall?: typeof import("vscode").CallHierarchyIncomingCall; CallHierarchyOutgoingCall?: typeof import("vscode").CallHierarchyOutgoingCall; TypeHierarchyItem?: typeof import("vscode").TypeHierarchyItem; LinkedEditingRanges?: typeof import("vscode").LinkedEditingRanges; DocumentDropOrPasteEditKind?: typeof import("vscode").DocumentDropOrPasteEditKind; DocumentDropEdit?: typeof import("vscode").DocumentDropEdit; DocumentPasteTriggerKind?: typeof import("vscode").DocumentPasteTriggerKind; DocumentPasteEdit?: typeof import("vscode").DocumentPasteEdit; IndentAction?: typeof import("vscode").IndentAction; SyntaxTokenType?: typeof import("vscode").SyntaxTokenType; ConfigurationTarget?: typeof import("vscode").ConfigurationTarget; Location?: typeof import("vscode").Location; DiagnosticSeverity?: typeof import("vscode").DiagnosticSeverity; DiagnosticRelatedInformation?: typeof import("vscode").DiagnosticRelatedInformation; DiagnosticTag?: typeof import("vscode").DiagnosticTag; Diagnostic?: typeof import("vscode").Diagnostic; LanguageStatusSeverity?: typeof import("vscode").LanguageStatusSeverity; ViewColumn?: typeof import("vscode").ViewColumn; StatusBarAlignment?: typeof import("vscode").StatusBarAlignment; TerminalLocation?: typeof import("vscode").TerminalLocation; TerminalShellExecutionCommandLineConfidence?: typeof import("vscode").TerminalShellExecutionCommandLineConfidence; TerminalLink?: typeof import("vscode").TerminalLink; TerminalProfile?: typeof import("vscode").TerminalProfile; FileDecoration?: typeof import("vscode").FileDecoration; ExtensionKind?: typeof import("vscode").ExtensionKind; ExtensionMode?: typeof import("vscode").ExtensionMode; ColorThemeKind?: typeof import("vscode").ColorThemeKind; TaskRevealKind?: typeof import("vscode").TaskRevealKind; TaskPanelKind?: typeof import("vscode").TaskPanelKind; TaskGroup?: typeof import("vscode").TaskGroup; ProcessExecution?: typeof import("vscode").ProcessExecution; ShellQuoting?: typeof import("vscode").ShellQuoting; ShellExecution?: typeof import("vscode").ShellExecution; CustomExecution?: typeof import("vscode").CustomExecution; TaskScope?: typeof import("vscode").TaskScope; Task?: typeof import("vscode").Task; tasks?: typeof import("vscode").tasks; FileType?: typeof import("vscode").FileType; FilePermission?: typeof import("vscode").FilePermission; FileSystemError?: typeof import("vscode").FileSystemError; FileChangeType?: typeof import("vscode").FileChangeType; UIKind?: typeof import("vscode").UIKind; LogLevel?: typeof import("vscode").LogLevel; env?: typeof import("vscode").env; commands?: typeof import("vscode").commands; DataTransferItem?: typeof import("vscode").DataTransferItem; DataTransfer?: typeof import("vscode").DataTransfer; TreeItem?: typeof import("vscode").TreeItem; TreeItemCollapsibleState?: typeof import("vscode").TreeItemCollapsibleState; TreeItemCheckboxState?: typeof import("vscode").TreeItemCheckboxState; TerminalExitReason?: typeof import("vscode").TerminalExitReason; EnvironmentVariableMutatorType?: typeof import("vscode").EnvironmentVariableMutatorType; ProgressLocation?: typeof import("vscode").ProgressLocation; QuickInputButtonLocation?: typeof import("vscode").QuickInputButtonLocation; QuickInputButtons?: typeof import("vscode").QuickInputButtons; TextDocumentChangeReason?: typeof import("vscode").TextDocumentChangeReason; TextDocumentSaveReason?: typeof import("vscode").TextDocumentSaveReason; languages?: typeof import("vscode").languages; NotebookEditorRevealType?: typeof import("vscode").NotebookEditorRevealType; NotebookCellKind?: typeof import("vscode").NotebookCellKind; NotebookRange?: typeof import("vscode").NotebookRange; NotebookCellOutputItem?: typeof import("vscode").NotebookCellOutputItem; NotebookCellOutput?: typeof import("vscode").NotebookCellOutput; NotebookCellData?: typeof import("vscode").NotebookCellData; NotebookData?: typeof import("vscode").NotebookData; NotebookControllerAffinity?: typeof import("vscode").NotebookControllerAffinity; NotebookCellStatusBarAlignment?: typeof import("vscode").NotebookCellStatusBarAlignment; NotebookCellStatusBarItem?: typeof import("vscode").NotebookCellStatusBarItem; notebooks?: typeof import("vscode").notebooks; scm?: typeof import("vscode").scm; DebugAdapterExecutable?: typeof import("vscode").DebugAdapterExecutable; DebugAdapterServer?: typeof import("vscode").DebugAdapterServer; DebugAdapterNamedPipeServer?: typeof import("vscode").DebugAdapterNamedPipeServer; DebugAdapterInlineImplementation?: typeof import("vscode").DebugAdapterInlineImplementation; Breakpoint?: typeof import("vscode").Breakpoint; SourceBreakpoint?: typeof import("vscode").SourceBreakpoint; FunctionBreakpoint?: typeof import("vscode").FunctionBreakpoint; DebugConsoleMode?: typeof import("vscode").DebugConsoleMode; DebugConfigurationProviderTriggerKind?: typeof import("vscode").DebugConfigurationProviderTriggerKind; DebugThread?: typeof import("vscode").DebugThread; DebugStackFrame?: typeof import("vscode").DebugStackFrame; debug?: typeof import("vscode").debug; extensions?: typeof import("vscode").extensions; CommentThreadCollapsibleState?: typeof import("vscode").CommentThreadCollapsibleState; CommentMode?: typeof import("vscode").CommentMode; CommentThreadState?: typeof import("vscode").CommentThreadState; comments?: typeof import("vscode").comments; authentication?: typeof import("vscode").authentication; l10n?: typeof import("vscode").l10n; tests?: typeof import("vscode").tests; TestRunProfileKind?: typeof import("vscode").TestRunProfileKind; TestTag?: typeof import("vscode").TestTag; TestRunRequest?: typeof import("vscode").TestRunRequest; TestMessageStackFrame?: typeof import("vscode").TestMessageStackFrame; TestMessage?: typeof import("vscode").TestMessage; TestCoverageCount?: typeof import("vscode").TestCoverageCount; FileCoverage?: typeof import("vscode").FileCoverage; StatementCoverage?: typeof import("vscode").StatementCoverage; BranchCoverage?: typeof import("vscode").BranchCoverage; DeclarationCoverage?: typeof import("vscode").DeclarationCoverage; TabInputText?: typeof import("vscode").TabInputText; TabInputTextDiff?: typeof import("vscode").TabInputTextDiff; TabInputCustom?: typeof import("vscode").TabInputCustom; TabInputWebview?: typeof import("vscode").TabInputWebview; TabInputNotebook?: typeof import("vscode").TabInputNotebook; TabInputNotebookDiff?: typeof import("vscode").TabInputNotebookDiff; TabInputTerminal?: typeof import("vscode").TabInputTerminal; TelemetryTrustedValue?: typeof import("vscode").TelemetryTrustedValue; ChatRequestTurn?: typeof import("vscode").ChatRequestTurn; ChatResponseTurn?: typeof import("vscode").ChatResponseTurn; ChatResultFeedbackKind?: typeof import("vscode").ChatResultFeedbackKind; ChatResponseMarkdownPart?: typeof import("vscode").ChatResponseMarkdownPart; ChatResponseFileTreePart?: typeof import("vscode").ChatResponseFileTreePart; ChatResponseAnchorPart?: typeof import("vscode").ChatResponseAnchorPart; ChatResponseProgressPart?: typeof import("vscode").ChatResponseProgressPart; ChatResponseReferencePart?: typeof import("vscode").ChatResponseReferencePart; ChatResponseCommandButtonPart?: typeof import("vscode").ChatResponseCommandButtonPart; chat?: typeof import("vscode").chat; LanguageModelChatMessageRole?: typeof import("vscode").LanguageModelChatMessageRole; LanguageModelChatMessage?: typeof import("vscode").LanguageModelChatMessage; LanguageModelError?: typeof import("vscode").LanguageModelError; McpStdioServerDefinition?: typeof import("vscode").McpStdioServerDefinition; McpHttpServerDefinition?: typeof import("vscode").McpHttpServerDefinition; lm?: typeof import("vscode").lm; LanguageModelChatToolMode?: typeof import("vscode").LanguageModelChatToolMode; LanguageModelToolCallPart?: typeof import("vscode").LanguageModelToolCallPart; LanguageModelToolResultPart?: typeof import("vscode").LanguageModelToolResultPart; LanguageModelTextPart?: typeof import("vscode").LanguageModelTextPart; LanguageModelPromptTsxPart?: typeof import("vscode").LanguageModelPromptTsxPart; LanguageModelToolResult?: typeof import("vscode").LanguageModelToolResult; LanguageModelDataPart?: typeof import("vscode").LanguageModelDataPart; } | null}
 */

const defaultTitleValue = "Без заголовка";
const defaultHintValue = "";

/**
 * Собирает данные для help-карты
 * @param {string} docsDir 
 * @returns {GenerationResults}
 */
function collectHelpData(docsDir) {
    /**
     * @type {HelpEntry[]}
     */
    const success = [];
    
    /**
     * @type {string[]}
     */
    const failed = [];

    /**
     * @param {string} dir
     */
    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);

        files.forEach((file) => {
            const fullPath = path.join(dir, file);
            if (file.startsWith('.')) return;

            if (fs.statSync(fullPath).isDirectory()) {
                walk(fullPath);
            } else if (file.endsWith(".md")) {
                try {
                    const content = fs.readFileSync(fullPath, "utf8");
                    const { data } = matter(content);

                    if (data.helptag) {
                        const relativePath = path
                            .relative(docsDir, fullPath)
                            .replace(/\.md$/, "")
                            .replace(/\\/g, "/");

                        // Структура Diplodoc обычно: docs/ru/article.md -> lang = ru
                        const lang = relativePath.split("/")[0] || "default";

                        /** @type {HelpEntry} */
                        const entry = {
                            url: relativePath,
                            title: data.title || defaultTitleValue,
                            hint: data.hint || defaultHintValue,
                            context: data.helptag,
                            lang: lang,
                        };
                        success.push(entry);
                    }
                } catch (err) {
                    failed.push(fullPath);
                }
            }
        });
    }

    walk(docsDir);
    return { success, failed };
}

const outputFileName = "app-help-contents.json";
const outputFolderName = "build";
const docsFolderName = "docs";

/**
 * Основная логика генерации и сохранения
 * @param {Object} options
 * @param {string} options.docsDir - Откуда берем md
 * @param {string} options.outputDir - Куда кладем json (по умолчанию 'build')
 * @param {boolean} options.segregation - Разделять ли по языкам
 */
function runGeneration({ docsDir, outputDir = outputFolderName, segregation = false }) {
    const results = collectHelpData(docsDir);
    const absoluteOutputDir = path.isAbsolute(outputDir) 
        ? outputDir 
        : path.join(process.cwd(), outputDir);

    if (!fs.existsSync(absoluteOutputDir)) {
        fs.mkdirSync(absoluteOutputDir, { recursive: true });
    }

    if (segregation) {
        // Группируем по языкам        
        const langMap = results.success.reduce((acc, item) => {
            if (!acc[item.lang]) acc[item.lang] = [];
            acc[item.lang].push(item);
            return acc;
        }, {});

        for (const [lang, items] of Object.entries(langMap)) {
            const langPath = path.join(absoluteOutputDir, lang);
            if (!fs.existsSync(langPath)) fs.mkdirSync(langPath, { recursive: true });
            
            const filePath = path.join(langPath, outputFileName);
            fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
            console.log(`[${lang}] Файл сохранён: ${filePath}`);
        }
    } else {
        // Сохраняем одним файлом
        const outputPath = path.join(absoluteOutputDir, outputFileName);
        fs.writeFileSync(outputPath, JSON.stringify(results.success, null, 2));
        console.log(`Общий файл сохранён: ${outputPath}`);
    }

    return results;
}

/**
 * Вызов из VS Code (Команда расширения)
 * @param {vscode.Uri} uri - Путь к папке, на которой нажали ПКМ
 */
async function generateHelpmaps(uri) {
    if (!vscode) return;

    // Если нажали в меню проводника, берем путь папки, иначе корень проекта
    const projectRoot = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
    const selectedPath = uri ? uri.fsPath : projectRoot;

    if (!selectedPath) {
        vscode.window.showErrorMessage("Не удалось определить рабочую директорию");
        return;
    }

    const options = {
        // Если вы хотите всегда сканировать /docs от корня проекта:
        docsDir: path.join(projectRoot, docsFolderName),
        // Или если хотите сканировать именно ту папку, на которой нажали ПКМ:
        // docsDir: selectedPath,
        outputDir: path.join(projectRoot, outputFolderName),
        segregation: false
    };

    try {
        const results = runGeneration(options);
        if (results.success.length > 0) {
            vscode.window.showInformationMessage(
                `Help-карта создана (${results.success.length} эл.). Путь: ${options.outputDir}`
            );
        } else {
            vscode.window.showWarningMessage("Не найдено файлов с тегом 'helptag' в " + options.docsDir);
        }
    } catch (err) {
        if (err instanceof Error) 
            vscode.window.showErrorMessage("Ошибка при генерации: " + err.message);
        else 
            throw err;
    }
}

// Запуск через CLI (node script.js)
if (require.main === module) {
    const projectRoot = process.cwd();
    
    // В будущем тут можно использовать библиотеку 'yargs' для парсинга --segregation
    runGeneration({
        docsDir: path.join(projectRoot, docsFolderName),
        outputDir: outputFolderName, 
        segregation: process.argv.includes("--segregate")
    });
} else {
    module.exports = { generateHelpmaps, runGeneration };
}
