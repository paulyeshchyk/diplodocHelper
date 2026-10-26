// @ts-nocheck
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { getGostDictionaryPath } = require('./gosts.dictionary');

function formatGostEntry(entry) {
    const lines = [];
    const codeKey = yaml.dump(entry.code, { lineWidth: -1 }).trim();
    lines.push(`- code: ${codeKey}`);
    
    // Добавляем type
    const typeKey = entry.type ? yaml.dump(entry.type, { lineWidth: -1 }).trim() : '"Прочее"';
    lines.push(`  type: ${typeKey}`);

    if (entry.title) {
        lines.push(`  title: >-`);
        String(entry.title).split('\n').forEach(l => lines.push(`    ${l}`));
    } else {
        lines.push(`  title: ""`);
    }

    if (entry.date) {
        lines.push(`  date: ${yaml.dump(entry.date, { lineWidth: -1 }).trim()}`);
    } else {
        lines.push(`  date:`);
    }

    if (entry.status) {
        lines.push(`  status: ${yaml.dump(entry.status, { lineWidth: -1 }).trim()}`);
    } else {
        lines.push(`  status:`);
    }

    if (entry.description) {
        lines.push(`  description: >-`);
        String(entry.description).split('\n').forEach(l => lines.push(`    ${l}`));
    } else {
        lines.push(`  description:`);
    }

    return lines.join('\n');
}

function appendGostToDictionary(langDir, entry, lang) {
    const dictPath = getGostDictionaryPath(langDir, lang);
    const normalizedCode = entry.code.trim();

    let entries = [];
    let header = '';

    if (fs.existsSync(dictPath)) {
        const existing = fs.readFileSync(dictPath, 'utf8');
        const firstEntryMatch = existing.match(/^-\s+code\s*:/m);
        if (firstEntryMatch && firstEntryMatch.index > 0) {
            header = existing.slice(0, firstEntryMatch.index);
        }

        try {
            const loaded = yaml.load(existing);
            if (Array.isArray(loaded)) {
                if (loaded.some(e => e.code === normalizedCode)) return false;
                entries = loaded;
            }
        } catch (err) {
            console.warn(`[gosts] Ошибка парсинга ${dictPath}: ${err.message}`);
        }
    }

    if (!header.trim()) {
        header = [
            '# Справочник ГОСТов.',
            '# Формат:',
            '#   - code: <Обозначение>',
            '#     type: <Тип стандарта>',
            '#     title: >-',
            '#       Название',
            '#     date: <Дата введения>',
            '#     status: <Статус>',
            '#     description: >-',
            '#       Дополнительная информация',
            '',
        ].join('\n');
    }

    entries.push({
        code: normalizedCode,
        type: entry.type ? entry.type.trim() : 'Прочее',
        title: String(entry.title || '').trim(),
        date: String(entry.date || '').trim(),
        status: String(entry.status || '').trim(),
        description: String(entry.description || '').trim()
    });

    // Сначала сортируем по типу, потом по коду (с учетом чисел)
    entries.sort((a, b) => {
        const typeCompare = String(a.type).localeCompare(String(b.type), 'ru');
        if (typeCompare !== 0) return typeCompare;
        return String(a.code).localeCompare(String(b.code), 'ru', { numeric: true });
    });

    let bodyLines = [];
    let currentGroup = '';

    for (const item of entries) {
        if (item.type && item.type !== currentGroup) {
            currentGroup = item.type;
            bodyLines.push(`# ── ${currentGroup} ──`);
            bodyLines.push('');
        }

        bodyLines.push(formatGostEntry(item));
        bodyLines.push('');
    }

    const finalContent = header.trimEnd() + '\n\n' + bodyLines.join('\n').trimEnd() + '\n';

    fs.mkdirSync(path.dirname(dictPath), { recursive: true });
    fs.writeFileSync(dictPath, finalContent, 'utf8');
    return true;
}

module.exports = { appendGostToDictionary };