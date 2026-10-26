// @ts-nocheck
const vscode = require('vscode');

const TERM_RE = /<abbr\b[^>]*\bclass\s*=\s*["'][^"']*\bterm\b[^"']*["'][^>]*>([\s\S]*?)<\/abbr>/gi;

class TermHighlighter {
    constructor(context) {
        this.tagDecoration = vscode.window.createTextEditorDecorationType({
            color: new vscode.ThemeColor('editorLineNumber.foreground'),
            opacity: '0.55',
        });

        this.contentDecoration = vscode.window.createTextEditorDecorationType({
            textDecoration: 'underline dotted',
            color: new vscode.ThemeColor('editorInfo.foreground'),
        });

        this.timer = null;

        this.subscribe(context);
        this.refreshAll();
    }

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
                if (e.affectsConfiguration('diplodoc-helper.termHighlightEnabled')) {
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

    refreshEditor(editor) {
        const enabled = vscode.workspace.getConfiguration('diplodoc-helper').get('termHighlightEnabled', true);

        if (!enabled || editor.document.languageId !== 'markdown') {
            editor.setDecorations(this.tagDecoration, []);
            editor.setDecorations(this.contentDecoration, []);
            return;
        }

        const tagRanges = [];
        const contentRanges = [];

        const doc = editor.document;

        for (const visible of editor.visibleRanges) {
            const visibleStartOffset = doc.offsetAt(visible.start);
            const visibleText = doc.getText(visible);

            const re = new RegExp(TERM_RE.source, 'gi');
            let m;
            while ((m = re.exec(visibleText)) !== null) {
                const matchStartOffset = visibleStartOffset + m.index;
                const matchLength = m[0].length;
                const matchEndOffset = matchStartOffset + matchLength;

                const openTagLength = m[0].indexOf('>') + 1;
                if (openTagLength <= 0 || openTagLength >= matchLength) continue;

                const closeTagStart = m[0].lastIndexOf('</abbr>');
                if (closeTagStart < openTagLength) continue;

                tagRanges.push(
                    new vscode.Range(doc.positionAt(matchStartOffset), doc.positionAt(matchStartOffset + openTagLength))
                );

                tagRanges.push(
                    new vscode.Range(doc.positionAt(matchStartOffset + closeTagStart), doc.positionAt(matchEndOffset))
                );

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

module.exports = { TermHighlighter };