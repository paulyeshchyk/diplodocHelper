// plugins/json-to-md-table.js
const fs = require('fs');
const path = require('path');

// ─── ЭКРАНИРОВАНИЕ ────────────────────────────────────────────
const escMd      = (s) => String(s ?? '—').replace(/\|/g, '&#124;');
const escMdLine  = (s) => escMd(s).replace(/\r?\n/g, ' ');
const escMermaid = (s) => String(s ?? '—').replace(/"/g, '&quot;').replace(/\r?\n/g, ' ').trim();

// ─── ТАБЛИЦЫ ──────────────────────────────────────────────────
function generateExtendedTable(issues) {
    if (!issues || issues.length === 0) return 'Нет данных для отображения.';
    let result = '#|\n';
    result += '|| **ID** | **Тип** | **Severity** | **Модуль** | **Кратко** | **Подробности** ||\n';
    for (const issue of issues) {
        const details = issue.details && issue.details.trim()
            ? `{% cut "Развернуть" %}\n\n${escMd(issue.details.trim())}\n\n{% endcut %}`
            : '—';
        result += '||\n';
        result += `${escMd(issue.id)}\n|\n`;
        result += `${escMd(issue.type)}\n|\n`;
        result += `${escMd(issue.severity)}\n|\n`;
        result += `${escMd(issue.module)}\n|\n`;
        result += `${escMd(issue.title)}\n|\n`;
        result += `${details}\n`;
        result += '||\n';
    }
    return result + '|#\n';
}

function generateSimpleTable(issues) {
    if (!issues || issues.length === 0) return 'Нет данных для отображения.';
    let result = '| ID | Тип | Severity | Модуль | Кратко | Подробности |\n';
    result += '| --- | --- | --- | --- | --- | --- |\n';
    for (const issue of issues) {
        const id       = escMdLine(issue.id       || '—');
        const type     = escMdLine(issue.type     || '—');
        const severity = escMdLine(issue.severity || '—');
        const module_  = escMdLine(issue.module   || '—');
        const title    = escMdLine(issue.title    || '—');
        const details  = issue.details && issue.details.trim()
            ? issue.details.trim().replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
            : '—';
        result += `| ${id} | ${type} | ${severity} | ${module_} | ${title} | ${details} |\n`;
    }
    return result;
}

// ─── TREEMAP-BETA ─────────────────────────────────────────────
/**
 * Строит mermaid treemap-beta из плоского массива объектов.
 * Ось Y = yField (верхний уровень), ось X = xField (вложенный),
 * листья = labelField (по умолчанию id).
 *
 * @param {Array<Object>} issues
 * @param {Object} [opts]
 * @param {string} [opts.xField='module']
 * @param {string} [opts.yField='layer']
 * @param {string} [opts.labelField='id']
 * @param {string|null} [opts.valueField=null] — числовое поле для размера
 * @param {'count'|'sum'|'max'|'min'} [opts.valueAgg='count']
 * @param {string|null} [opts.classField=null] — поле, значение которого даёт CSS-класс
 * @param {Array<{name:string, style:string}>} [opts.classDefs=[]]
 * @param {boolean} [opts.flat=false] — склеить «Y / X» в один секционный заголовок
 */
function generateTreemap(issues, opts = {}) {
    const {
        xField = 'module',
        yField = 'layer',
        labelField = 'id',
        valueField = null,
        valueAgg = 'count',
        classField = null,
        classDefs = [],
        flat = false,
    } = opts;

    if (!issues || issues.length === 0) return 'treemap-beta\n"Нет данных"\n';

    // Группировка: Y → X → [items]
    const tree = new Map();
    for (const issue of issues) {
        const y = issue[yField] ?? '—';
        const x = issue[xField] ?? '—';
        if (!tree.has(y)) tree.set(y, new Map());
        const xMap = tree.get(y);
        if (!xMap.has(x)) xMap.set(x, []);
        xMap.get(x).push(issue);
    }

    const classOf = (item) => {
        if (!classField) return '';
        const raw = item[classField];
        if (raw == null) return '';
        return `:::${String(raw).replace(/[^\w-]/g, '_')}`;
    };

    let out = 'treemap-beta\n';

    for (const [y, xMap] of tree) {
        if (flat) {
            for (const [x, items] of xMap) {
                out += `"${escMermaid(y)} / ${escMermaid(x)}"\n`;
                for (const item of items) {
                    const label = escMermaid(item[labelField] ?? '—');
                    const value = valueField ? (Number(item[valueField]) || 1) : 1;
                    out += `    "${label}": ${value}${classOf(item)}\n`;
                }
            }
        } else {
            out += `"${escMermaid(y)}"\n`;
            for (const [x, items] of xMap) {
                out += `    "${escMermaid(x)}"\n`;
                for (const item of items) {
                    const label = escMermaid(item[labelField] ?? '—');
                    const value = valueField ? (Number(item[valueField]) || 1) : 1;
                    out += `        "${label}": ${value}${classOf(item)}\n`;
                }
            }
        }
    }

    if (classDefs.length > 0) {
        out += '\n';
        for (const def of classDefs) {
            out += `classDef ${def.name} ${def.style};\n`;
        }
    }
    return out;
}

/** Оборачивает mermaid в markdown-блок для .md-файла. */
function wrapMermaid(mermaidCode) {
    return '```mermaid\n' + mermaidCode.trimEnd() + '\n```\n';
}

// ─── ПАРСЕР АРГУМЕНТОВ ────────────────────────────────────────
function parseArgs(argv) {
    const out = {
        jsonPath: null,
        outputDir: null,
        outputFile: null,
        tableType: 'extended',
        xField: 'module',
        yField: 'layer',
        labelField: 'id',
        valueField: null,
        valueAgg: 'count',
        classField: null,
        flat: false,
    };
    const positional = [];
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) { positional.push(a); continue; }
        const eq = a.indexOf('=');
        let key, val;
        if (eq !== -1) { key = a.slice(0, eq); val = a.slice(eq + 1); }
        else { key = a; val = argv[++i]; }

        switch (key) {
            case '--jsonPath':    out.jsonPath    = val; break;
            case '--outputDir':   out.outputDir   = val; break;
            case '--outputFile':  out.outputFile  = val; break;
            case '--tableType':   out.tableType   = val; break;
            case '--xField':      out.xField      = val; break;
            case '--yField':      out.yField      = val; break;
            case '--labelField':  out.labelField  = val; break;
            case '--valueField':  out.valueField  = val || null; break;
            case '--valueAgg':    out.valueAgg    = val; break;
            case '--classField':  out.classField  = val || null; break;
            case '--flat':        out.flat        = true; break;
        }
    }
    if (!out.jsonPath)  out.jsonPath  = positional[0] || './known-issues-summary.json';
    if (!out.outputDir) out.outputDir = positional[1] || './docs';
    if (positional[2])  out.tableType = positional[2];
    return out;
}

// ─── ОСНОВНАЯ ФУНКЦИЯ ─────────────────────────────────────────
function convertJsonToMdTable(opts) {
    const {
        jsonPath,
        outputDir,
        outputFile,
        tableType = 'extended',
        xField, yField, labelField, valueField, valueAgg, classField, flat,
    } = opts;

    console.log(`[json-to-md] Чтение JSON из: ${jsonPath}`);
    if (!fs.existsSync(jsonPath)) {
        console.error(`❌ [json-to-md] Файл не найден: ${jsonPath}`);
        return { success: false };
    }

    let issues;
    try {
        issues = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (err) {
        console.error(`❌ [json-to-md] Ошибка чтения/парсинга JSON: ${err.message}`);
        return { success: false };
    }

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const mode = String(tableType).toLowerCase();
    let content, fileName;

    if (mode === 'simple' || mode === 'standard') {
        content  = generateSimpleTable(issues);
        fileName = outputFile || 'known-issues-simple.md';
    } else if (mode === 'treemap') {
        const mermaid = generateTreemap(issues, {
            xField, yField, labelField, valueField, valueAgg, classField, flat,
        });
        content  = wrapMermaid(mermaid);
        fileName = outputFile || 'known-issues-treemap.md';
    } else {
        content  = generateExtendedTable(issues);
        fileName = outputFile || 'known-issues-summary.md';
    }

    const outputPath = path.join(outputDir, fileName);
    try {
        fs.writeFileSync(outputPath, content, 'utf8');
        console.log(`✅ [json-to-md] Создан: ${outputPath} (режим: ${mode})`);
        return { success: true, outputPath };
    } catch (err) {
        console.error(`❌ [json-to-md] Ошибка записи: ${err.message}`);
        return { success: false };
    }
}

// ─── CLI-ТОЧКА ВХОДА ──────────────────────────────────────────
if (require.main === module) {
    convertJsonToMdTable(parseArgs(process.argv.slice(2)));
} else {
    module.exports = {
        convertJsonToMdTable,
        generateExtendedTable,
        generateSimpleTable,
        generateTreemap,
        wrapMermaid,
    };
}