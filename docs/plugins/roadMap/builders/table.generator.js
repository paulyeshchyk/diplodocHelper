// @ts-nocheck
// plugins/roadMap/table.generator.js

/**
 * Генерирует Markdown-таблицу с группировкой по группам и модулям
 * @param {Array} data – массив объектов из JSON
 * @returns {string} Markdown-разметка
 */
function generateTableContent(data) {
    // Фильтруем только функции (у них есть даты)
    const functions = data.filter(item => item.type === 'function');

    // Группируем: группа -> модуль -> список функций
    const groups = {};
    const modules = {};

    // Сначала собираем все модули и группы
    data.forEach(item => {
        if (item.type === 'group') {
            groups[item.id] = { id: item.id, name: item.name, modules: [] };
        } else if (item.type === 'module') {
            modules[item.id] = { id: item.id, name: item.name, groupId: item.dependencies[0] }; // предполагаем, что первый dependency – группа
            if (item.dependencies.length > 0) {
                const groupId = item.dependencies[0];
                if (groups[groupId]) {
                    groups[groupId].modules.push(item.id);
                }
            }
        }
    });

    // Привязываем функции к модулям
    const funcByModule = {};
    functions.forEach(func => {
        // у функции dependencies: первый элемент – модуль (по соглашению)
        const moduleId = func.dependencies[0];
        if (!funcByModule[moduleId]) funcByModule[moduleId] = [];
        funcByModule[moduleId].push(func);
    });

    // Строим таблицу
    let md = '\n\n'; //'### Таблица планов\n\n';
    md += '| Группа | Модуль | Функция | Начало | Конец | Зависимости |\n';
    md += '|--------|--------|---------|--------|-------|-------------|\n';

    // Проходим по группам в порядке появления (сохраним порядок из JSON)
    const groupOrder = data.filter(item => item.type === 'group').map(g => g.id);
    for (const groupId of groupOrder) {
        const group = groups[groupId];
        if (!group) continue;
        const moduleIds = group.modules || [];
        // Для каждой группы выводим строки с группировкой: можно выводить заголовки групп отдельно, но в таблице проще дублировать
        for (const moduleId of moduleIds) {
            const module = modules[moduleId];
            if (!module) continue;
            const funcs = funcByModule[moduleId] || [];
            if (funcs.length === 0) {
                // Модуль без функций – выводим одну строку
                md += `| ${group.name} | ${module.name} | (нет функций) | | | |\n`;
            } else {
                funcs.forEach((func, index) => {
                    const start = func.start || '';
                    const end = func.end || '';
                    const deps = (func.dependencies || []).filter(id => id !== moduleId).join(', ');
                    if (index === 0) {
                        md += `| ${group.name} | ${module.name} | ${func.name} | ${start} | ${end} | ${deps} |\n`;
                    } else {
                        md += `| | | ${func.name} | ${start} | ${end} | ${deps} |\n`;
                    }
                });
            }
        }
    }

    return md;
}

/**
 * Генерирует компактную Markdown-таблицу с иерархией через отступы в первой колонке
 * @param {Array} data – массив объектов из JSON
 * @returns {string} Markdown-разметка
 */
function generateTableCompact(data) {
    // Фильтруем только функции
    const functions = data.filter(item => item.type === 'function');

    // Собираем группы и модули
    const groups = {};
    const modules = {};

    data.forEach(item => {
        if (item.type === 'group') {
            groups[item.id] = { id: item.id, name: item.name, modules: [], start: item.start, end: item.end };
        } else if (item.type === 'module') {
            modules[item.id] = {
                id: item.id,
                name: item.name,
                groupId: item.dependencies[0],
                start: item.start,
                end: item.end,
            };
            if (item.dependencies.length > 0) {
                const groupId = item.dependencies[0];
                if (groups[groupId]) {
                    groups[groupId].modules.push(item.id);
                }
            }
        }
    });

    // Привязываем функции к модулям
    const funcByModule = {};
    functions.forEach(func => {
        const moduleId = func.dependencies[0];
        if (!funcByModule[moduleId]) funcByModule[moduleId] = [];
        funcByModule[moduleId].push(func);
    });

    // Определяем порядок групп (по порядку в JSON)
    const groupOrder = data.filter(item => item.type === 'group').map(g => g.id);

    // Строим строки таблицы
    const rows = [];

    groupOrder.forEach(groupId => {
        const group = groups[groupId];
        if (!group) return;

        // Строка для группы
        rows.push({
            level: 0,
            name: group.name,
            start: group.start || '--',
            end: group.end || '--',
            deps: '',
        });

        const moduleIds = group.modules || [];
        moduleIds.forEach(moduleId => {
            const module = modules[moduleId];
            if (!module) return;

            const moduleLabel = module.url ? `[${module.name}](module.url)` : `${module.name}`;

            // Строка для модуля (отступ 2 неразрывных пробела)
            rows.push({
                level: 1,
                name: '&nbsp;&nbsp;&nbsp;&nbsp; ' + moduleLabel,
                start: module.start || '-',
                end: module.end || '-',
                deps: '',
            });

            const funcs = funcByModule[moduleId] || [];
            funcs.forEach(func => {
                // Строка для функции (отступ 4 неразрывных пробела)
                const start = func.start || '';
                const end = func.end || '';
                const deps = (func.dependencies || []).filter(id => id !== moduleId).join(', ');
                const funcLabel = func.url ? `[${func.name}](func.url)` : `${func.name}`;

                rows.push({
                    level: 2,
                    name: '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' + funcLabel,
                    start: start,
                    end: end,
                    deps: deps,
                });
            });
        });
    });

    // Генерируем Markdown-таблицу
    let md = '\n\n';
    md += '| | Начало | Конец | Зависимости |\n';
    md += '|---|--------|-------|-------------|\n';

    rows.forEach(row => {
        md += `| ${row.name} | ${row.start} | ${row.end} | ${row.deps} |\n`;
    });

    return md;
}

module.exports = { generateTableContent, generateTableCompact };
