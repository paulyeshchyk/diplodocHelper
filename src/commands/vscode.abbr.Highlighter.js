const vscode = require('vscode');

// \u0000 / \x00 в regex-литералах триггерит ESLint no-control-regex — не используем.
// Регулярка только для тегов <abbr>; сами теги достаточно простые.
const ABBR_RE = /<abbr\b[^>]*>([\s\S]*?)<\/abbr>/gi;

class AbbrHighlighter {
    /**
     * @param {vscode.ExtensionContext} context
     */
    constructor(context) {
        /** @type {vscode.TextEditorDecorationType} */
        this.tagDecoration = vscode.window.createTextEditorDecorationType({
            color: new vscode.ThemeColor('editorLineNumber.foreground'),
            opacity: '0.55',
        });

        /** @type {vscode.TextEditorDecorationType} */
        this.contentDecoration = vscode.window.createTextEditorDecorationType({
            textDecoration: 'underline dotted',
            color: new vscode.ThemeColor('editorInfo.foreground'),
        });

        /** @type {NodeJS.Timeout | null} */
        this.timer = null;

        this.subscribe(context);
        this.refreshAll();
    }

    /**
     * @param {vscode.ExtensionContext} context
     */
    subscribe(context) {
        context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor(() => this.scheduleRefresh()),
            vscode.window.onDidChangeVisibleTextEditors(() => this.scheduleRefresh()),
            vscode.window.onDidChangeTextEditorVisibleRanges(() => this.scheduleRefresh()),
            vscode.workspace.onDidChangeTextDocument(e => {
                const active = vscode.window.activeTextEditor;
                if (!active) return;
                if (e.document !== active.document) return;
                if (e.document.languageId !== 'markdown') return;
                this.scheduleRefresh();
            }),
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('diplodoc-helper.abbrHighlightEnabled')) {
                    this.refreshAll();
                }
            })
        );
    }

    scheduleRefresh() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.refreshAll(), 120);
    }

    refreshAll() {
        for (const editor of vscode.window.visibleTextEditors) {
            this.refreshEditor(editor);
        }
    }

    /**
     * @param {vscode.TextEditor} editor
     */
    refreshEditor(editor) {
        const enabled = vscode.workspace.getConfiguration('diplodoc-helper').get('abbrHighlightEnabled', true);

        if (!enabled || editor.document.languageId !== 'markdown') {
            editor.setDecorations(this.tagDecoration, []);
            editor.setDecorations(this.contentDecoration, []);
            return;
        }

        /** @type {vscode.Range[]} */
        const tagRanges = [];
        /** @type {vscode.Range[]} */
        const contentRanges = [];

        const doc = editor.document;

        for (const visible of editor.visibleRanges) {
            const visibleStartOffset = doc.offsetAt(visible.start);
            const visibleText = doc.getText(visible);

            const re = new RegExp(ABBR_RE.source, 'gi');
            let m;
            while ((m = re.exec(visibleText)) !== null) {
                const matchStartOffset = visibleStartOffset + m.index;
                const matchLength = m[0].length;
                const matchEndOffset = matchStartOffset + matchLength;

                const openTagLength = m[0].indexOf('>') + 1;
                if (openTagLength <= 0 || openTagLength >= matchLength) continue;

                const closeTagStart = m[0].lastIndexOf('</abbr>');
                if (closeTagStart < openTagLength) continue;

                // открывающий тег
                tagRanges.push(
                    new vscode.Range(doc.positionAt(matchStartOffset), doc.positionAt(matchStartOffset + openTagLength))
                );

                // закрывающий тег
                tagRanges.push(
                    new vscode.Range(doc.positionAt(matchStartOffset + closeTagStart), doc.positionAt(matchEndOffset))
                );

                // содержимое (если не пустое)
                const contentStartOffset = matchStartOffset + openTagLength;
                const contentEndOffset = matchStartOffset + closeTagStart;
                if (contentEndOffset > contentStartOffset) {
                    contentRanges.push(
                        new vscode.Range(doc.positionAt(contentStartOffset), doc.positionAt(contentEndOffset))
                    );
                }
            }
        }

        editor.setDecorations(this.tagDecoration, tagRanges);
        editor.setDecorations(this.contentDecoration, contentRanges);
    }

    dispose() {
        if (this.timer) clearTimeout(this.timer);
        this.tagDecoration.dispose();
        this.contentDecoration.dispose();
    }
}

module.exports = { AbbrHighlighter };
