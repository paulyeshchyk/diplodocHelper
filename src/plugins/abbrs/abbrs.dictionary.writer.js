// @ts-nocheck
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { getAbbrDictionaryPath } = require('./abbrs.dictionary');

function formatAbbrEntry(entry) {
    let lines = [];
    const abbrKey = entry.abbr ? yaml.dump(entry.abbr, { lineWidth: -1 }).trim() : '""';
    lines.push(`- abbr: ${abbrKey}`);

    if (entry.full) {
        lines.push(`  full: |-`);
        const fullLines = String(entry.full).split('\n');
        fullLines.forEach(l => lines.push(`    ${l}`));
    } else {
        lines.push(`  full: ""`);
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
 * Append-insert в словарь сокращений с сохранением сортировки,
 * добавлением пустых строк и алфавитных разделителей.
 *
 * @param {string} langDir
 * @param {{ abbr: string, full: string, category?: string, description?: string }} entry
 * @param {string} [lang]
 * @returns {boolean} true — добавлено, false — уже было
 */
function appendAbbrToDictionary(langDir, entry, lang) {
    const dictPath = getAbbrDictionaryPath(langDir, lang);
    const normalizedAbbr = entry.abbr.trim();

    /** @type {any[]} */
    let entries = [];
    let header = '';

    if (fs.existsSync(dictPath)) {
        const existing = fs.readFileSync(dictPath, 'utf8');

        const firstEntryMatch = existing.match(/^-\s+abbr\s*:/m);
        if (firstEntryMatch && firstEntryMatch.index > 0) {
            header = existing.slice(0, firstEntryMatch.index);
        }

        try {
            const loaded = yaml.load(existing);
            if (Array.isArray(loaded)) {
                const exists = loaded.some(
                    e => e && typeof e === 'object' && String(e.abbr || '').trim() === normalizedAbbr
                );
                if (exists) return false;
                entries = loaded;
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[abbrs] Не удалось распарсить ${dictPath}: ${msg}`);
        }
    }

    if (!header.trim()) {
        header = [
            '# Словарь сокращений.',
            '# Формат:',
            '#   - abbr: <как в тексте>',
            '#     full: |-',
            '#       Полная форма (можно использовать Markdown-ссылки).',
            '#     category:',
            '#     description: |-',
            '#       Текст описания.',
            '',
        ].join('\n');
    }

    const newEntry = {
        abbr: normalizedAbbr,
        full: String(entry.full || '').trim(),
    };
    if (entry.category && String(entry.category).trim()) {
        newEntry.category = String(entry.category).trim();
    }
    if (entry.description && String(entry.description).trim()) {
        newEntry.description = String(entry.description).trim();
    }
    entries.push(newEntry);

    // Сортировка по abbr
    entries.sort((a, b) => 
        String(a.abbr || '').localeCompare(String(b.abbr || ''), 'ru', { sensitivity: 'base' })
    );

    let bodyLines = [];
    let currentLetter = '';

    for (const item of entries) {
        const firstLetter = String(item.abbr || '').charAt(0).toUpperCase();
        
        if (firstLetter && firstLetter !== currentLetter) {
            currentLetter = firstLetter;
            bodyLines.push(`# ── ${currentLetter} ──`);
            bodyLines.push('');
        }

        bodyLines.push(formatAbbrEntry(item));
        bodyLines.push('');
    }

    const finalContent = header.trimEnd() + '\n\n' + bodyLines.join('\n').trimEnd() + '\n';
    
    fs.mkdirSync(path.dirname(dictPath), { recursive: true });
    fs.writeFileSync(dictPath, finalContent, 'utf8');
    return true;
}

module.exports = { appendAbbrToDictionary };