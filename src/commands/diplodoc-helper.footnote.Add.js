// src/commands/diplodoc-helper.footnote.Add.js

const { nls_ts, translate } = require('../nls_ts.js');
const vscode = require('vscode');

/**
 * Добавляет сноску к выделенному тексту.
 * Схема:
 *   1. Пользователь выделяет слово -> ввод текста сноски.
 *   2. После выделения вставляется [^N].
 *   3. Все референсы и определения в файле перенумеровываются по порядку.
 *   4. Новое определение [^N]: text добавляется в блок сносок внизу файла.
 */
const { computeFootnoteRenumbering } = require('../plugins/reindexer/reindexer.footnotes.js');

/**
 * Добавляет сноску к выделенному тексту.
 * Схема:
 *   1. Пользователь выделяет слово -> ввод текста сноски.
 *   2. После выделения вставляется [^N] (N — по позиции среди уникальных рефов).
 *   3. Все референсы и определения перенумеровываются.
 *   4. Определения внизу сортируются по номеру (если образуют непрерывный блок).
 */
async function ux_footnote_add() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.footnote.add.error.noEditor));
        return;
    }
    if (editor.document.languageId !== 'markdown') {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.footnote.add.error.notMarkdown));
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.footnote.add.error.noSelection));
        return;
    }

    const selectedText = editor.document.getText(selection);
    if (!selectedText || selectedText.trim().length === 0) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.footnote.add.error.emptySelection));
        return;
    }

    const footnoteContent = await vscode.window.showInputBox({
        prompt: translate(nls_ts.plugin.footnote.add.input.prompt),
        placeHolder: translate(nls_ts.plugin.footnote.add.input.placeHolder),
        validateInput: v =>
            !v || v.trim().length === 0 ? translate(nls_ts.plugin.footnote.add.input.error.empty) : null,
    });
    if (footnoteContent === undefined) return;

    const document = editor.document;
    const fullText = document.getText();
    const selectionStart = document.offsetAt(selection.start);
    const selectionEnd = document.offsetAt(selection.end);

    // 1. Строим план по УЖЕ существующему тексту
    const plan = computeFootnoteRenumbering(fullText);

    // 2. Номер для новой сноски = (кол-во УНИКАЛЬНЫХ рефов до выделения) + 1
    const uniqueBefore = new Set();
    for (const r of plan.refs) {
        if (r.index >= selectionEnd) break;
        uniqueBefore.add(r.id);
    }
    const newNumber = uniqueBefore.size + 1;

    /** @type {{index: number, length: number, replacement: string}[]} */
    const edits = [];

    // 3. Вставляем новый референс [^N]
    edits.push({
        index: selectionEnd,
        length: 0,
        replacement: `[^${newNumber}]`,
    });

    // 4. Обновляем существующие референсы
    for (const r of plan.refs) {
        // пропускаем референсы ВНУТРИ выделения (редкий случай)
        if (r.index >= selectionStart && r.index + r.length <= selectionEnd) continue;

        const baseNum = plan.idToNewNumber.get(r.id);
        if (baseNum === undefined) continue;

        // Сдвигаем номер на +1, если его базовый номер >= номера новой сноски
        const shifted = baseNum >= newNumber ? baseNum + 1 : baseNum;

        if (String(shifted) !== r.id) {
            edits.push({ index: r.index, length: r.length, replacement: `[^${shifted}]` });
        }
    }

    // 5. Определения
    if (plan.defs.length > 0 && plan.reorderInfo.canReorder) {
        // Собираем итоговый отсортированный список и ЗАМЕНЯЕМ весь блок
        /** @type {{num: number, content: string}[]} */
        const finalDefs = [];

        for (const d of plan.newDefs) {
            if (d.content === null) continue; // orphan
            const baseNum = Number(d.id);
            const shifted = baseNum >= newNumber ? baseNum + 1 : baseNum;
            finalDefs.push({ num: shifted, content: d.content });
        }
        finalDefs.push({ num: newNumber, content: footnoteContent });
        finalDefs.sort((a, b) => a.num - b.num);

        const blockContent = finalDefs.map(d => `[^${d.num}]: ${d.content}`).join('\n');

        edits.push({
            index: plan.reorderInfo.blockStart,
            length: plan.reorderInfo.blockEnd - plan.reorderInfo.blockStart,
            replacement: blockContent,
        });
    } else if (plan.defs.length > 0) {
        // Непрерывного блока нет — пересчитываем определения на месте
        for (const d of plan.defs) {
            const baseNum = plan.idToNewNumber.get(d.id);
            if (baseNum === undefined) continue; // orphan пропускаем
            const shifted = baseNum >= newNumber ? baseNum + 1 : baseNum;
            if (String(shifted) !== d.id) {
                edits.push({
                    index: d.index,
                    length: d.length,
                    replacement: `[^${shifted}]: ${d.content}`,
                });
            }
        }
        // И добавляем новое определение после последнего
        const lastDef = plan.defs[plan.defs.length - 1];
        edits.push({
            index: lastDef.index + lastDef.length,
            length: 0,
            replacement: `\n[^${newNumber}]: ${footnoteContent}`,
        });
    } else {
        // Определений ещё нет — добавляем блок в конец файла
        const prefix = fullText.endsWith('\n\n') ? '' : fullText.endsWith('\n') ? '\n' : '\n\n';
        edits.push({
            index: fullText.length,
            length: 0,
            replacement: `${prefix}[^${newNumber}]: ${footnoteContent}\n`,
        });
    }

    // 6. Применяем все правки от конца к началу
    edits.sort((a, b) => b.index - a.index);

    const ok = await editor.edit(editBuilder => {
        for (const e of edits) {
            const start = document.positionAt(e.index);
            const end = document.positionAt(e.index + e.length);
            editBuilder.replace(new vscode.Range(start, end), e.replacement);
        }
    });

    if (!ok) {
        vscode.window.showErrorMessage(translate(nls_ts.plugin.footnote.add.error.failed));
        return;
    }

    vscode.window.showInformationMessage(translate(nls_ts.plugin.footnote.add.info.success, newNumber));
}

module.exports = { ux_footnote_add };
