// diplodoc-helper.generateContexts.js
const fs = require("fs");
const path = require("path");

// Подключаем vscode только если мы в контексте редактора
/**
 * @type {{ workspace: any; window: any; version?: string; Position?: typeof import("vscode").Position; Range?: typeof import("vscode").Range; Selection?: typeof import("vscode").Selection; TextEditorSelectionChangeKind?: typeof import("vscode").TextEditorSelectionChangeKind; TextEditorCursorStyle?: typeof import("vscode").TextEditorCursorStyle; TextEditorLineNumbersStyle?: typeof import("vscode").TextEditorLineNumbersStyle; TextEditorRevealType?: typeof import("vscode").TextEditorRevealType; OverviewRulerLane?: typeof import("vscode").OverviewRulerLane; DecorationRangeBehavior?: typeof import("vscode").DecorationRangeBehavior; ThemeColor?: typeof import("vscode").ThemeColor; ThemeIcon?: typeof import("vscode").ThemeIcon; EndOfLine?: typeof import("vscode").EndOfLine; Uri?: typeof import("vscode").Uri; CancellationTokenSource?: typeof import("vscode").CancellationTokenSource; CancellationError?: typeof import("vscode").CancellationError; Disposable?: typeof import("vscode").Disposable; EventEmitter?: typeof import("vscode").EventEmitter; QuickPickItemKind?: typeof import("vscode").QuickPickItemKind; InputBoxValidationSeverity?: typeof import("vscode").InputBoxValidationSeverity; RelativePattern?: typeof import("vscode").RelativePattern; CodeActionKind?: typeof import("vscode").CodeActionKind; CodeActionTriggerKind?: typeof import("vscode").CodeActionTriggerKind; CodeAction?: typeof import("vscode").CodeAction; CodeLens?: typeof import("vscode").CodeLens; MarkdownString?: typeof import("vscode").MarkdownString; Hover?: typeof import("vscode").Hover; EvaluatableExpression?: typeof import("vscode").EvaluatableExpression; InlineValueText?: typeof import("vscode").InlineValueText; InlineValueVariableLookup?: typeof import("vscode").InlineValueVariableLookup; InlineValueEvaluatableExpression?: typeof import("vscode").InlineValueEvaluatableExpression; DocumentHighlightKind?: typeof import("vscode").DocumentHighlightKind; DocumentHighlight?: typeof import("vscode").DocumentHighlight; SymbolKind?: typeof import("vscode").SymbolKind; SymbolTag?: typeof import("vscode").SymbolTag; SymbolInformation?: typeof import("vscode").SymbolInformation; DocumentSymbol?: typeof import("vscode").DocumentSymbol; TextEdit?: typeof import("vscode").TextEdit; SnippetTextEdit?: typeof import("vscode").SnippetTextEdit; NotebookEdit?: typeof import("vscode").NotebookEdit; WorkspaceEdit?: typeof import("vscode").WorkspaceEdit; SnippetString?: typeof import("vscode").SnippetString; SemanticTokensLegend?: typeof import("vscode").SemanticTokensLegend; SemanticTokensBuilder?: typeof import("vscode").SemanticTokensBuilder; SemanticTokens?: typeof import("vscode").SemanticTokens; SemanticTokensEdits?: typeof import("vscode").SemanticTokensEdits; SemanticTokensEdit?: typeof import("vscode").SemanticTokensEdit; ParameterInformation?: typeof import("vscode").ParameterInformation; SignatureInformation?: typeof import("vscode").SignatureInformation; SignatureHelp?: typeof import("vscode").SignatureHelp; SignatureHelpTriggerKind?: typeof import("vscode").SignatureHelpTriggerKind; CompletionItemKind?: typeof import("vscode").CompletionItemKind; CompletionItemTag?: typeof import("vscode").CompletionItemTag; CompletionItem?: typeof import("vscode").CompletionItem; CompletionList?: typeof import("vscode").CompletionList; CompletionTriggerKind?: typeof import("vscode").CompletionTriggerKind; InlineCompletionList?: typeof import("vscode").InlineCompletionList; InlineCompletionTriggerKind?: typeof import("vscode").InlineCompletionTriggerKind; InlineCompletionItem?: typeof import("vscode").InlineCompletionItem; DocumentLink?: typeof import("vscode").DocumentLink; Color?: typeof import("vscode").Color; ColorInformation?: typeof import("vscode").ColorInformation; ColorPresentation?: typeof import("vscode").ColorPresentation; InlayHintKind?: typeof import("vscode").InlayHintKind; InlayHintLabelPart?: typeof import("vscode").InlayHintLabelPart; InlayHint?: typeof import("vscode").InlayHint; FoldingRange?: typeof import("vscode").FoldingRange; FoldingRangeKind?: typeof import("vscode").FoldingRangeKind; SelectionRange?: typeof import("vscode").SelectionRange; CallHierarchyItem?: typeof import("vscode").CallHierarchyItem; CallHierarchyIncomingCall?: typeof import("vscode").CallHierarchyIncomingCall; CallHierarchyOutgoingCall?: typeof import("vscode").CallHierarchyOutgoingCall; TypeHierarchyItem?: typeof import("vscode").TypeHierarchyItem; LinkedEditingRanges?: typeof import("vscode").LinkedEditingRanges; DocumentDropOrPasteEditKind?: typeof import("vscode").DocumentDropOrPasteEditKind; DocumentDropEdit?: typeof import("vscode").DocumentDropEdit; DocumentPasteTriggerKind?: typeof import("vscode").DocumentPasteTriggerKind; DocumentPasteEdit?: typeof import("vscode").DocumentPasteEdit; IndentAction?: typeof import("vscode").IndentAction; SyntaxTokenType?: typeof import("vscode").SyntaxTokenType; ConfigurationTarget?: typeof import("vscode").ConfigurationTarget; Location?: typeof import("vscode").Location; DiagnosticSeverity?: typeof import("vscode").DiagnosticSeverity; DiagnosticRelatedInformation?: typeof import("vscode").DiagnosticRelatedInformation; DiagnosticTag?: typeof import("vscode").DiagnosticTag; Diagnostic?: typeof import("vscode").Diagnostic; LanguageStatusSeverity?: typeof import("vscode").LanguageStatusSeverity; ViewColumn?: typeof import("vscode").ViewColumn; StatusBarAlignment?: typeof import("vscode").StatusBarAlignment; TerminalLocation?: typeof import("vscode").TerminalLocation; TerminalShellExecutionCommandLineConfidence?: typeof import("vscode").TerminalShellExecutionCommandLineConfidence; TerminalLink?: typeof import("vscode").TerminalLink; TerminalProfile?: typeof import("vscode").TerminalProfile; FileDecoration?: typeof import("vscode").FileDecoration; ExtensionKind?: typeof import("vscode").ExtensionKind; ExtensionMode?: typeof import("vscode").ExtensionMode; ColorThemeKind?: typeof import("vscode").ColorThemeKind; TaskRevealKind?: typeof import("vscode").TaskRevealKind; TaskPanelKind?: typeof import("vscode").TaskPanelKind; TaskGroup?: typeof import("vscode").TaskGroup; ProcessExecution?: typeof import("vscode").ProcessExecution; ShellQuoting?: typeof import("vscode").ShellQuoting; ShellExecution?: typeof import("vscode").ShellExecution; CustomExecution?: typeof import("vscode").CustomExecution; TaskScope?: typeof import("vscode").TaskScope; Task?: typeof import("vscode").Task; tasks?: typeof import("vscode").tasks; FileType?: typeof import("vscode").FileType; FilePermission?: typeof import("vscode").FilePermission; FileSystemError?: typeof import("vscode").FileSystemError; FileChangeType?: typeof import("vscode").FileChangeType; UIKind?: typeof import("vscode").UIKind; LogLevel?: typeof import("vscode").LogLevel; env?: typeof import("vscode").env; commands?: typeof import("vscode").commands; DataTransferItem?: typeof import("vscode").DataTransferItem; DataTransfer?: typeof import("vscode").DataTransfer; TreeItem?: typeof import("vscode").TreeItem; TreeItemCollapsibleState?: typeof import("vscode").TreeItemCollapsibleState; TreeItemCheckboxState?: typeof import("vscode").TreeItemCheckboxState; TerminalExitReason?: typeof import("vscode").TerminalExitReason; EnvironmentVariableMutatorType?: typeof import("vscode").EnvironmentVariableMutatorType; ProgressLocation?: typeof import("vscode").ProgressLocation; QuickInputButtonLocation?: typeof import("vscode").QuickInputButtonLocation; QuickInputButtons?: typeof import("vscode").QuickInputButtons; TextDocumentChangeReason?: typeof import("vscode").TextDocumentChangeReason; TextDocumentSaveReason?: typeof import("vscode").TextDocumentSaveReason; languages?: typeof import("vscode").languages; NotebookEditorRevealType?: typeof import("vscode").NotebookEditorRevealType; NotebookCellKind?: typeof import("vscode").NotebookCellKind; NotebookRange?: typeof import("vscode").NotebookRange; NotebookCellOutputItem?: typeof import("vscode").NotebookCellOutputItem; NotebookCellOutput?: typeof import("vscode").NotebookCellOutput; NotebookCellData?: typeof import("vscode").NotebookCellData; NotebookData?: typeof import("vscode").NotebookData; NotebookControllerAffinity?: typeof import("vscode").NotebookControllerAffinity; NotebookCellStatusBarAlignment?: typeof import("vscode").NotebookCellStatusBarAlignment; NotebookCellStatusBarItem?: typeof import("vscode").NotebookCellStatusBarItem; notebooks?: typeof import("vscode").notebooks; scm?: typeof import("vscode").scm; DebugAdapterExecutable?: typeof import("vscode").DebugAdapterExecutable; DebugAdapterServer?: typeof import("vscode").DebugAdapterServer; DebugAdapterNamedPipeServer?: typeof import("vscode").DebugAdapterNamedPipeServer; DebugAdapterInlineImplementation?: typeof import("vscode").DebugAdapterInlineImplementation; Breakpoint?: typeof import("vscode").Breakpoint; SourceBreakpoint?: typeof import("vscode").SourceBreakpoint; FunctionBreakpoint?: typeof import("vscode").FunctionBreakpoint; DebugConsoleMode?: typeof import("vscode").DebugConsoleMode; DebugConfigurationProviderTriggerKind?: typeof import("vscode").DebugConfigurationProviderTriggerKind; DebugThread?: typeof import("vscode").DebugThread; DebugStackFrame?: typeof import("vscode").DebugStackFrame; debug?: typeof import("vscode").debug; extensions?: typeof import("vscode").extensions; CommentThreadCollapsibleState?: typeof import("vscode").CommentThreadCollapsibleState; CommentMode?: typeof import("vscode").CommentMode; CommentThreadState?: typeof import("vscode").CommentThreadState; comments?: typeof import("vscode").comments; authentication?: typeof import("vscode").authentication; l10n?: typeof import("vscode").l10n; tests?: typeof import("vscode").tests; TestRunProfileKind?: typeof import("vscode").TestRunProfileKind; TestTag?: typeof import("vscode").TestTag; TestRunRequest?: typeof import("vscode").TestRunRequest; TestMessageStackFrame?: typeof import("vscode").TestMessageStackFrame; TestMessage?: typeof import("vscode").TestMessage; TestCoverageCount?: typeof import("vscode").TestCoverageCount; FileCoverage?: typeof import("vscode").FileCoverage; StatementCoverage?: typeof import("vscode").StatementCoverage; BranchCoverage?: typeof import("vscode").BranchCoverage; DeclarationCoverage?: typeof import("vscode").DeclarationCoverage; TabInputText?: typeof import("vscode").TabInputText; TabInputTextDiff?: typeof import("vscode").TabInputTextDiff; TabInputCustom?: typeof import("vscode").TabInputCustom; TabInputWebview?: typeof import("vscode").TabInputWebview; TabInputNotebook?: typeof import("vscode").TabInputNotebook; TabInputNotebookDiff?: typeof import("vscode").TabInputNotebookDiff; TabInputTerminal?: typeof import("vscode").TabInputTerminal; TelemetryTrustedValue?: typeof import("vscode").TelemetryTrustedValue; ChatRequestTurn?: typeof import("vscode").ChatRequestTurn; ChatResponseTurn?: typeof import("vscode").ChatResponseTurn; ChatResultFeedbackKind?: typeof import("vscode").ChatResultFeedbackKind; ChatResponseMarkdownPart?: typeof import("vscode").ChatResponseMarkdownPart; ChatResponseFileTreePart?: typeof import("vscode").ChatResponseFileTreePart; ChatResponseAnchorPart?: typeof import("vscode").ChatResponseAnchorPart; ChatResponseProgressPart?: typeof import("vscode").ChatResponseProgressPart; ChatResponseReferencePart?: typeof import("vscode").ChatResponseReferencePart; ChatResponseCommandButtonPart?: typeof import("vscode").ChatResponseCommandButtonPart; chat?: typeof import("vscode").chat; LanguageModelChatMessageRole?: typeof import("vscode").LanguageModelChatMessageRole; LanguageModelChatMessage?: typeof import("vscode").LanguageModelChatMessage; LanguageModelError?: typeof import("vscode").LanguageModelError; McpStdioServerDefinition?: typeof import("vscode").McpStdioServerDefinition; McpHttpServerDefinition?: typeof import("vscode").McpHttpServerDefinition; lm?: typeof import("vscode").lm; LanguageModelChatToolMode?: typeof import("vscode").LanguageModelChatToolMode; LanguageModelToolCallPart?: typeof import("vscode").LanguageModelToolCallPart; LanguageModelToolResultPart?: typeof import("vscode").LanguageModelToolResultPart; LanguageModelTextPart?: typeof import("vscode").LanguageModelTextPart; LanguageModelPromptTsxPart?: typeof import("vscode").LanguageModelPromptTsxPart; LanguageModelToolResult?: typeof import("vscode").LanguageModelToolResult; LanguageModelDataPart?: typeof import("vscode").LanguageModelDataPart; }}
 */
let vscode;
try {
  vscode = require("vscode");
} catch (e) {
  // В режиме shell/cli библиотеки vscode не будет, это нормально
}

const INDEX_MD_DEFAULT_CONTENT = (/** @type {string} */ title) =>
  ["---", `title: ${title}`, "---"].join("\n");

// --- Утилиты ---
/**
 * @typedef {Object} PageInfo
 * @property {string} title
 * @property {string} href
 */

/**
 * @typedef {Object} ContextData
 * @property {number} rank
 * @property {PageInfo[]} pages
 */

/**
 * @typedef {Object.<string, ContextData>} ContextMap
 */

/**
 * @param {string} str
 */
function slugify(str) {
  return str
    .replace(/[^\p{L}\p{N}\-\._]/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * @param {string} filePath
 */
function getTitleFromMetadata(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");
  const metaTitleMatch = content.match(/^---[\s\S]*?title:\s*(.*)[\s\S]*?---/);
  if (metaTitleMatch && metaTitleMatch[1]) return metaTitleMatch[1].trim();
  const h1Match = content.match(/^#\s+(.*)/m);
  return h1Match ? h1Match[1].trim() : null;
}

/**
 * @param {string} fullPath
 * @param {string} langDir
 */
function getDisplayTitle(fullPath, langDir) {
  const articleTitle =
    getTitleFromMetadata(fullPath) || path.basename(fullPath);
  const parentDir = path.dirname(fullPath);
  const parentIndexPath = path.join(parentDir, "..", "index.md");
  if (parentDir !== langDir) {
    const parentTitle = getTitleFromMetadata(parentIndexPath);
    if (parentTitle) return `${articleTitle} - ${parentTitle}`;
  }
  return articleTitle;
}

// --- Сбор данных ---

/**
 * @param {string} langDir
 * @returns {ContextMap}
 */
function collectContextsForLang(langDir) {
  /** @type {ContextMap} */
  const contextMap = {};
  /**
   * @param {string} dir
   */
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.lstatSync(fullPath);
      if (stat.isDirectory()) {
        if (file !== "contexts") walk(fullPath);
      } else if (file.endsWith(".md")) {
        const content = fs.readFileSync(fullPath, "utf8");
        const match = content.match(/^---[\s\S]*?context:\s*(.*)[\s\S]*?---/);
        if (match && match[1]) {
          const terms = match[1].split(",").map((t) => t.trim().toLowerCase());
          const displayTitle = getDisplayTitle(fullPath, langDir);
          const relativeToLang = path
            .relative(langDir, fullPath)
            .replace(/\\/g, "/");
          for (const term of terms) {
            if (!contextMap[term]) contextMap[term] = { rank: 0, pages: [] };
            contextMap[term].rank += 1;
            contextMap[term].pages.push({
              title: displayTitle,
              href: relativeToLang,
            });
          }
        }
      }
    }
  }
  walk(langDir);
  return contextMap;
}

// --- Генерация файлов ---

/**
 * @param {string} outputDir
 * @param {string[]} sortedTerms
 * @param {ContextMap} contextMap
 */
function writeTermFiles(outputDir, sortedTerms, contextMap) {
  for (const term of sortedTerms) {
    const slug = slugify(term);
    let content = `# ${term.toUpperCase()}\n\n`;
    contextMap[term].pages.forEach((p) => {
      content += `* [${p.title}](../${p.href})\n`;
    });
    fs.writeFileSync(path.join(outputDir, `${slug}.md`), content, "utf8");
  }
}

/**
 * @param {string} outputDir
 * @param {string[]} sortedTerms
 * @param {ContextMap} contextMap
 * @param {string} lang
 * @param {string} title
 */
function writeIndexMd(outputDir, sortedTerms, contextMap, lang, title) {
  const suffix = lang === "ru" ? "ст." : "docs";
  let content = INDEX_MD_DEFAULT_CONTENT(title);
  let currentLetter = "";
  for (const term of sortedTerms) {
    const firstLetter = term.charAt(0).toUpperCase();
    const slug = slugify(term);
    const count = contextMap[term].rank;
    if (firstLetter !== currentLetter) {
      if (currentLetter !== "") content += "\n";
      content += `\n## ${firstLetter}\n`;
      currentLetter = firstLetter;
    }
    content += `* [${term}](${slug}.md) (${count} ${suffix})\n`;
  }
  fs.writeFileSync(
    path.join(outputDir, "index.md"),
    content.trim() + "\n",
    "utf8",
  );
}

/**
 * @param {string} lang
 * @param {string} langDir
 * @param {ContextMap} contextMap
 * @returns {boolean}
 */
function generateFilesForLang(lang, langDir, contextMap) {
  try {
    if (Object.keys(contextMap).length === 0) return false;
    const outputDir = path.join(langDir, "contexts");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const sortedTerms = Object.keys(contextMap).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    const title = lang === "ru" ? "Контексты" : "Contexts";
    writeTermFiles(outputDir, sortedTerms, contextMap);
    writeIndexMd(outputDir, sortedTerms, contextMap, lang, title);
    const slugifiedItems = sortedTerms.map((t) => ({
      term: t,
      slug: slugify(t),
    }));
    const tocItems = slugifiedItems
      .map((i) => `  - name: ${i.term}\n    href: ${i.slug}.md`)
      .join("\n");
    fs.writeFileSync(
      path.join(outputDir, "toc.yaml"),
      `title: ${title}\nhref: index.md\nitems:\n${tocItems}`,
      "utf8",
    );
    const linksYaml = slugifiedItems
      .map(
        (i) =>
          `- title: ${i.term}\n  description: "Rank: ${contextMap[i.term].rank}"\n  href: ${i.slug}.md`,
      )
      .join("\n");
    fs.writeFileSync(
      path.join(outputDir, "index.yaml"),
      `title: ${title}\nlinks:\n${linksYaml}`,
      "utf8",
    );
    return true;
  } catch (err) {
    console.error(`Error generating files for ${lang}:`, err);
    return false;
  }
}

/**
 * Глобальная функция логики (без привязки к интерфейсу VS Code)
 * @param {string} docsRoot
 * @returns {{ success: string[], failed: string[] }}
 */
function runGeneration(docsRoot) {
  /** @type {string[]} */
  const LANGUAGES = ["ru", "en"];

  /** @type {{success: string[],failed:string[]}} */
  const results = { success: [], failed: [] };

  for (const lang of LANGUAGES) {
    const langDir = path.join(docsRoot, lang);
    if (fs.existsSync(langDir)) {
      const contextMap = collectContextsForLang(langDir);
      if (generateFilesForLang(lang, langDir, contextMap)) {
        results.success.push(lang);
      } else {
        results.failed.push(lang);
      }
    }
  }
  return results;
}

/**
 * Точка входа для VS Code API
 */
async function generateContexts() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return;
  const projectRoot = workspaceFolders[0].uri.fsPath;
  const DOCS_ROOT = path.join(projectRoot, "docs");

  const results = runGeneration(DOCS_ROOT);

  if (results.success.length > 0) {
    vscode.window.showInformationMessage(
      `✅ Контексты обновлены: ${results.success.join(", ")}`,
    );
  } else {
    vscode.window.showErrorMessage(
      "❌ Не удалось найти теги 'context:' в документации.",
    );
  }
}

// --- МАГИЯ ГИБКОГО ЗАПУСКА ---

if (require.main === module) {
  // Если скрипт запущен напрямую (node или npx)
  console.log("🚀 Запуск генерации контекстов в режиме CLI...");
  const projectRoot = process.cwd();
  const DOCS_ROOT = path.join(projectRoot, "docs");

  const results = runGeneration(DOCS_ROOT);

  console.log(`✅ Успешно: ${results.success.join(", ") || "нет"}`);
  if (results.failed.length > 0)
    console.log(`⚠️ Пропущено: ${results.failed.join(", ")}`);
} else {
  // Если скрипт подключен через require (в extension.js)
  module.exports = { generateContexts };
}
