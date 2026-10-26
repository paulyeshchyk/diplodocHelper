// @ts-nocheck
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { getTermDictionaryPath } = require('./terms.dictionary');

/**
 * Форматирует одну запись в красивый YAML с блочным текстом `>-`.
 * @param {any} entry
 * @returns {string}
 */
function formatTermEntry(entry) {
    let lines = [];
    const termKey = entry.term ? yaml.dump(entry.term, { lineWidth: -1 }).trim() : '""';
    lines.push(`- term: ${termKey}`);

    if (entry.definition) {
        lines.push(`  definition: |-`);
        const defLines = String(entry.definition).split('\n');
        defLines.forEach(l => lines.push(`    ${l}`));
    } else {
        lines.push(`  definition: ""`);
    }

    if (entry.category && String(entry.category).trim() !== '') {
        lines.push(`  category: ${yaml.dump(entry.category, { lineWidth: -1 }).trim()}`);
    } else {
        lines.push(`  category:`);
    }

    if (entry.description && String(entry.description).trim() !== '') {
        lines.push(`  description: |-`);
        const descLines = String(entry.description).split('\n');
        descLines.forEach(l => lines.push(`    ${l}`));
    } else {
        lines.push(`  description:`);
    }

    return lines.join('\n');
}

/**
 * Добавляет термин в словарь, сохраняя сортировку по алфавиту,
 * добавляя пустые строки и алфавитные комментарии.
 * 
 * @param {string} langDir
 * @param {{ term: string, definition: string, category?: string, description?: string }} entry
 * @param {string} [lang]
 * @returns {boolean} true — добавлено, false — уже было или ошибка
 */
function appendTermToDictionary(langDir, entry, lang) {
    const dictPath = getTermDictionaryPath(langDir, lang);
    const normalizedTerm = entry.term.trim();
    
    /** @type {any[]} */
    let entries = [];
    let header = '';

    // 1. Читаем существующий файл
    if (fs.existsSync(dictPath)) {
        const existing = fs.readFileSync(dictPath, 'utf8');

        // Отделяем шапку (комментарии) от массива данных
        const firstEntryMatch = existing.match(/^-\s+term\s*:/m);
        if (firstEntryMatch && firstEntryMatch.index > 0) {
            header = existing.slice(0, firstEntryMatch.index);
        }

        try {
            const loaded = yaml.load(existing);
            if (Array.isArray(loaded)) {
                // Проверяем на дубликат
                const exists = loaded.some(
                    e => e && typeof e === 'object' && String(e.term || '').trim() === normalizedTerm
                );
                if (exists) return false;
                entries = loaded;
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[terms] Не удалось распарсить ${dictPath}, начинаем с чистого листа: ${msg}`);
        }
    }

    // 2. Если шапки нет, создаем дефолтную
    if (!header.trim()) {
        header = [
            '# Словарь терминов.',
            '# Формат:',
            '#   - term: <каноническая форма>',
            '#     definition: |-',
            '#       Текст определения (можно использовать Markdown-ссылки).',
            '#     category:',
            '#     description: |-',
            '#       Текст описания.',
            '',
        ].join('\n');
    }

    // 3. Добавляем новую запись
    const newEntry = {
        term: normalizedTerm,
        definition: String(entry.definition || '').trim(),
    };
    if (entry.category && String(entry.category).trim()) {
        newEntry.category = String(entry.category).trim();
    }
    if (entry.description && String(entry.description).trim()) {
        newEntry.description = String(entry.description).trim();
    }
    entries.push(newEntry);

    // 4. Сортируем по полю term
    entries.sort((a, b) => 
        String(a.term || '').localeCompare(String(b.term || ''), 'ru', { sensitivity: 'base' })
    );

    // 5. Собираем итоговый текст с алфавитными комментариями
    let bodyLines = [];
    let currentLetter = '';

    for (const item of entries) {
        const firstLetter = String(item.term || '').charAt(0).toUpperCase();
        
        // Добавляем алфавитный разделитель, если буква изменилась
        if (firstLetter && firstLetter !== currentLetter) {
            currentLetter = firstLetter;
            bodyLines.push(`# ── ${currentLetter} ──`);
            bodyLines.push(''); // Пустая строка после заголовка
        }

        bodyLines.push(formatTermEntry(item));
        bodyLines.push(''); // Пустая строка между терминами
    }

    const finalContent = header.trimEnd() + '\n\n' + bodyLines.join('\n').trimEnd() + '\n';
    
    // 6. Записываем файл
    fs.mkdirSync(path.dirname(dictPath), { recursive: true });
    fs.writeFileSync(dictPath, finalContent, 'utf8');
    return true;
}

module.exports = { appendTermToDictionary };