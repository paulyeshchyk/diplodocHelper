// src/plugins/reindexer/reindexer.footnotes.js

const fs = require('fs');
const path = require('path');
const { collectMdFilesByToc } = require('../utils/toc.order');

/** Ссылка на сноску: [^N] в тексте, но НЕ [^N]: (это определение) */
const FOOTNOTE_REF_REGEX = /\[\^([^\]\s]+)\](?!:)/g;

/** Определение сноски: [^N]: text (многострочно, ^ — начало строки) */
const FOOTNOTE_DEF_REGEX = /^\[\^([^\]\s]+)\]:[ \t]*(.*)$/gm;

/**
 * Информация о возможности переупорядочивания определений.
 * `canReorder = true` только если между определениями нет ничего, кроме пробелов
 * и переводов строк — то есть весь блок можно безопасно заменить.
 *
 * @typedef {Object} FootnoteReorderInfo
 * @property {boolean} canReorder
 * @property {number} blockStart
 * @property {number} blockEnd
 */

/**
 * @typedef {Object} FootnoteRef
 * @property {string} id
 * @property {number} index
 * @property {number} length
 */

/**
 * @typedef {Object} FootnoteDef
 * @property {string} id
 * @property {number} index
 * @property {number} length
 * @property {string} content
 */

/**
 * Референс в плане перенумерации. Дополнительно хранит исходный id,
 * чтобы можно было понять, изменился ли номер.
 *
 * @typedef {Object} FootnoteRefUpdate
 * @property {string} id            — новый номер (как строка)
 * @property {string} originalId    — исходный id
 * @property {number} index
 * @property {number} length
 */

/**
 * Определение в плане перенумерации.
 * `content === null` означает «определение нужно удалить целиком»
 * (для него нет соответствующего референса, либо это дубликат).
 *
 * @typedef {Object} FootnoteDefUpdate
 * @property {string} id            — новый номер (как строка)
 * @property {string} originalId    — исходный id
 * @property {number} index
 * @property {number} length
 * @property {string | null} content
 */

/**
 * @typedef {Object} FootnoteRenumberingPlan
 * @property {FootnoteRef[]} refs
 * @property {FootnoteDef[]} defs
 * @property {Map<string, number>} idToNewNumber
 * @property {FootnoteRefUpdate[]} newRefs
 * @property {FootnoteDefUpdate[]} newDefs
 * @property {FootnoteReorderInfo} reorderInfo
 * @property {boolean} changed
 */

/**
 * Проверяет, образуют ли определения сносок непрерывный блок
 * (между ними — только пробелы и переводы строк).
 *
 * @param {string} text
 * @param {FootnoteDef[]} defs
 * @returns {FootnoteReorderInfo}
 */
function analyzeDefBlock(text, defs) {
    if (defs.length === 0) {
        return { canReorder: false, blockStart: 0, blockEnd: 0 };
    }
    if (defs.length === 1) {
        const d = defs[0];
        return { canReorder: true, blockStart: d.index, blockEnd: d.index + d.length };
    }
    for (let i = 1; i < defs.length; i++) {
        const prevEnd = defs[i - 1].index + defs[i - 1].length;
        const gap = text.slice(prevEnd, defs[i].index);
        if (!/^\s*$/.test(gap)) {
            return { canReorder: false, blockStart: 0, blockEnd: 0 };
        }
    }
    const first = defs[0];
    const last = defs[defs.length - 1];
    return {
        canReorder: true,
        blockStart: first.index,
        blockEnd: last.index + last.length,
    };
}

/**
 * Все референсы [^N] в тексте в порядке появления.
 * @param {string} text
 * @returns {FootnoteRef[]}
 */
function extractFootnoteRefs(text) {
    const refs = [];
    const re = new RegExp(FOOTNOTE_REF_REGEX.source, 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
        refs.push({ id: m[1], index: m.index, length: m[0].length });
    }
    return refs;
}

/**
 * Все определения [^N]: text в тексте.
 * @param {string} text
 * @returns {FootnoteDef[]}
 */
function extractFootnoteDefs(text) {
    const defs = [];
    const re = new RegExp(FOOTNOTE_DEF_REGEX.source, 'gm');
    let m;
    while ((m = re.exec(text)) !== null) {
        defs.push({
            id: m[1],
            index: m.index,
            length: m[0].length,
            content: m[2],
        });
    }
    return defs;
}

/**
 * Перенумеровывает все сноски в одном файле.
 *
 * @param {string} text
 * @returns {FootnoteRenumberingPlan}
 */
function computeFootnoteRenumbering(text, startNumber = 1) {
    const refs = extractFootnoteRefs(text);
    const defs = extractFootnoteDefs(text);

    /** @type {Map<string, number>} */
    const idToNewNumber = new Map();
    for (const r of refs) {
        if (!idToNewNumber.has(r.id)) {
            idToNewNumber.set(r.id, startNumber + idToNewNumber.size);
        }
    }

    /** @type {FootnoteRefUpdate[]} */
    const newRefs = refs.map(r => ({
        id: String(idToNewNumber.get(r.id)),
        originalId: r.id,
        index: r.index,
        length: r.length,
    }));

    /** @type {FootnoteDefUpdate[]} */
    const newDefs = [];
    const seenDefIds = new Set();
    for (const d of defs) {
        const num = idToNewNumber.get(d.id);
        if (num === undefined) {
            newDefs.push({ id: d.id, originalId: d.id, index: d.index, length: d.length, content: null });
            continue;
        }
        if (seenDefIds.has(d.id)) {
            newDefs.push({ id: String(num), originalId: d.id, index: d.index, length: d.length, content: null });
            continue;
        }
        seenDefIds.add(d.id);
        newDefs.push({ id: String(num), originalId: d.id, index: d.index, length: d.length, content: d.content });
    }

    const reorderInfo = analyzeDefBlock(text, defs);

    // --- Детектор изменений ---
    let changed = false;
    for (const r of newRefs) {
        if (r.id !== r.originalId) {
            changed = true;
            break;
        }
    }
    if (!changed) {
        for (const d of newDefs) {
            if (d.content === null || d.id !== d.originalId) {
                changed = true;
                break;
            }
        }
    }
    // ← НОВОЕ: проверяем, нужно ли переупорядочивание
    if (!changed && reorderInfo.canReorder && newDefs.length > 1) {
        const numbers = newDefs.filter(d => d.content !== null).map(d => Number(d.id));
        const sorted = [...numbers].sort((a, b) => a - b);
        if (numbers.join(',') !== sorted.join(',')) changed = true;
    }

    return { refs, defs, idToNewNumber, newRefs, newDefs, reorderInfo, changed };
}

/**
 * Применяет перенумерацию к строке. Возвращает новую строку.
 * @param {string} text
 * @param {FootnoteRenumberingPlan} plan
 * @returns {string}
 */
function applyFootnoteRenumbering(text, plan) {
    /** @type {{index: number, length: number, replacement: string}[]} */
    const edits = [];

    // --- 1. Правки референсов [^N] ---
    for (const r of plan.newRefs) {
        if (r.id !== r.originalId) {
            edits.push({ index: r.index, length: r.length, replacement: `[^${r.id}]` });
        }
    }

    // --- 2. Правки определений ---
    if (plan.reorderInfo.canReorder && plan.newDefs.length > 0) {
        // Заменяем ВЕСЬ блок одним куском, отсортированным по номеру
        const sortedDefs = plan.newDefs.filter(d => d.content !== null).sort((a, b) => Number(a.id) - Number(b.id));

        const blockContent = sortedDefs.map(d => `[^${d.id}]: ${d.content}`).join('\n');

        edits.push({
            index: plan.reorderInfo.blockStart,
            length: plan.reorderInfo.blockEnd - plan.reorderInfo.blockStart,
            replacement: blockContent,
        });
    } else {
        // Непрерывного блока нет — правим каждое определение на месте
        for (const d of plan.newDefs) {
            if (d.content === null) {
                // «осиротевшее» определение удаляем вместе с переводом строки
                let end = d.index + d.length;
                if (text[end] === '\r') end++;
                if (text[end] === '\n') end++;
                edits.push({ index: d.index, length: end - d.index, replacement: '' });
                continue;
            }
            if (d.id !== d.originalId) {
                edits.push({
                    index: d.index,
                    length: d.length,
                    replacement: `[^${d.id}]: ${d.content}`,
                });
            }
        }
    }

    // --- 3. Применяем с конца ---
    edits.sort((a, b) => b.index - a.index);

    let result = text;
    for (const e of edits) {
        result = result.slice(0, e.index) + e.replacement + result.slice(e.index + e.length);
    }
    return result;
}

/**
 * Пересчитывает сноски в одном файле (с записью на диск).
 * @param {string} filePath
 * @returns {{changed: boolean, totalRefs: number}}
 */
function reindexFootnotesInFile(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    const plan = computeFootnoteRenumbering(text);
    const totalRefs = plan.refs.length;

    if (!plan.changed) return { changed: false, totalRefs };

    const newText = applyFootnoteRenumbering(text, plan);
    if (newText !== text) {
        fs.writeFileSync(filePath, newText, 'utf8');
        return { changed: true, totalRefs };
    }
    return { changed: false, totalRefs };
}

/**
 * Обходит все .md-файлы проекта и пересчитывает сноски.
 * @param {string} rootDir — корень языка (например docs/ru)
 * @returns {{success: boolean, total: number, changed: number, reason?: string}}
 */
function reindexFootnotes(rootDir) {
    // console.log('Сквозная переиндексация сносок...');

    if (!fs.existsSync(rootDir)) {
        return { success: false, total: 0, changed: 0, reason: 'folder_not_found' };
    }

    const files = collectMdFilesByToc(rootDir);

    let counter = 1; // следующий свободный номер
    let totalRefs = 0;
    let changedFiles = 0;

    for (const file of files) {
        try {
            const text = fs.readFileSync(file, 'utf8');
            const plan = computeFootnoteRenumbering(text, counter);
            totalRefs += plan.refs.length;

            // Сколько уникальных id встретилось — на столько сдвигаем счётчик
            counter += plan.idToNewNumber.size;

            if (!plan.changed) continue;

            const newText = applyFootnoteRenumbering(text, plan);
            if (newText !== text) {
                fs.writeFileSync(file, newText, 'utf8');
                changedFiles++;
                console.log(`  Обновлено: ${path.relative(rootDir, file)}`);
            }
        } catch (err) {
            console.error(`❌ Ошибка обработки ${file}:`, err);
        }
    }

    console.log(`Готово. Сносок: ${totalRefs}, изменено файлов: ${changedFiles}`);
    return { success: true, total: totalRefs, changed: changedFiles };
}

module.exports = {
    extractFootnoteRefs,
    extractFootnoteDefs,
    computeFootnoteRenumbering,
    analyzeDefBlock,
    applyFootnoteRenumbering,
    reindexFootnotesInFile,
    reindexFootnotes,
};
