// @ts-nocheck
// plugins/roadMap/builders/roadmap.data.js

/**
 * Преобразует "MM-YYYY" в число YYYYMM для удобного сравнения.
 * Пример: "03-2025" -> 202503
 */
function parseDateToNumber(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return 0;
    const parts = dateStr.split('-');
    if (parts.length !== 2) return 0;
    const month = parts[0].padStart(2, '0');
    const year = parts[1];
    return parseInt(`${year}${month}`, 10);
}

function prepareRoadmapData(data, sortDirection = 'asc') {
    const tasks = data.filter(item => item.type === 'function' && item.start && item.end);

    if (tasks.length === 0) {
        return { tasks: [], groups: {}, groupNames: [], groupMap: {}, mapping: {} };
    }

    // 1. Карта: модуль -> группа
    const moduleMap = {};
    data.forEach(item => {
        if (item.type === 'module') {
            const groupId = item.dependencies[0];
            moduleMap[item.id] = groupId;
        }
    });

    // 2. Карта групп
    const groupMap = {};
    data.forEach(item => {
        if (item.type === 'group') {
            groupMap[item.id] = item;
        }
    });

    // 3. Группировка задач
    const groups = {};
    tasks.forEach(task => {
        const moduleId = task.dependencies[0];
        const groupId = moduleMap[moduleId];
        const groupObj = groupMap[groupId];
        const groupName = groupObj ? groupObj.name : 'Без группы';
        if (!groups[groupName]) groups[groupName] = { tasks: [], groupId: groupId };
        groups[groupName].tasks.push(task);
    });

    // 4. Сбор ссылок (mapping)
    const mapping = {};
    tasks.forEach(task => {
        if (task.url) {
            mapping[task.id] = task.url;
        }
    });

    // 5. Сортировка задач внутри групп
    const isAsc = sortDirection === 'asc';
    const multiplier = isAsc ? 1 : -1;

    Object.keys(groups).forEach(groupName => {
        groups[groupName].tasks.sort((a, b) => {
            const endA = parseDateToNumber(a.end);
            const endB = parseDateToNumber(b.end);
            if (endA !== endB) return (endA - endB) * multiplier;
            const startA = parseDateToNumber(a.start);
            const startB = parseDateToNumber(b.start);
            return (startA - startB) * multiplier;
        });
    });

    // 6. Сортировка групп
    const groupNames = Object.keys(groups).sort((aName, bName) => {
        const dateA = isAsc
            ? Math.min(...groups[aName].tasks.map(t => parseDateToNumber(t.start)))
            : Math.max(...groups[aName].tasks.map(t => parseDateToNumber(t.end)));
        const dateB = isAsc
            ? Math.min(...groups[bName].tasks.map(t => parseDateToNumber(t.start)))
            : Math.max(...groups[bName].tasks.map(t => parseDateToNumber(t.end)));
        return (dateA - dateB) * multiplier;
    });

    return {
        tasks,
        groups,
        groupNames,
        groupMap,
        mapping,
        parseDateToNumber,
    };
}

module.exports = {
    parseDateToNumber,
    prepareRoadmapData,
};
