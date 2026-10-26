// @ts-nocheck
const { prepareRoadmapData } = require('./roadmap.data');

/**
 * Генерирует исходный Mermaid Gantt скрипт и JSON-маппинг ссылок
 */
function generateMermaidScript(data, lang = 'ru', options = {}) {
    const { useShortSection = true, showHeaderTask = true, sortDirection = 'asc', useShortLabels = false } = options;

    const { tasks, groups, groupNames, groupMap, mapping, parseDateToNumber } = prepareRoadmapData(data, sortDirection);

    if (tasks.length === 0) {
        return {
            script: '```mermaid\ngantt\n    title Нет данных для отображения\n```',
            mapping: {},
        };
    }

    let mermaid = '```mermaid\ngantt\n';
    mermaid += '    title ' + (lang === 'ru' ? 'План релизов' : 'Release Plan') + '\n';
    mermaid += '    dateFormat MM-YYYY\n';
    mermaid += '    axisFormat %m-%Y\n';

    groupNames.forEach((groupName, index) => {
        const groupData = groups[groupName];
        const taskList = groupData.tasks;
        const groupId = groupData.groupId;
        const groupObj = groupMap[groupId];

        const sectionName = useShortSection ? (lang === 'ru' ? 'Группа' : 'Group') + ` ${index + 1}` : groupName;

        mermaid += `    section ${sectionName}\n`;

        // 1. Веха (Milestone)
        if (showHeaderTask) {
            const minStart = taskList.reduce(
                (min, t) => (parseDateToNumber(t.start) < parseDateToNumber(min) ? t.start : min),
                taskList[0].start
            );
            const milestoneId = `milestone_${index}`;
            const milestoneLabel = `${groupName} :milestone, ${milestoneId}, ${minStart}, ${minStart}`;
            mermaid += `    ${milestoneLabel}\n`;

            if (groupObj && groupObj.url) {
                mapping[milestoneId] = groupObj.url;
            }
        }

        // 2. Задачи
        taskList.forEach(task => {
            const deps = task.dependencies.filter(id => {
                const depItem = data.find(d => d.id === id);
                return depItem && depItem.type === 'function';
            });
            let afterPart = deps.length > 0 ? `, after ${deps.join(' ')}` : '';
            let label = useShortLabels ? `[${task.id}]` : task.name;

            mermaid += `    ${label} :active, ${task.id}${afterPart}, ${task.start}, ${task.end}\n`;
        });
    });

    mermaid += '```';

    return {
        script: mermaid,
        mapping,
    };
}

module.exports = {
    generateMermaidScript,
};
