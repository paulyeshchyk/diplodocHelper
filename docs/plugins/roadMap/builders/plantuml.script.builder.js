// @ts-nocheck
const { prepareRoadmapData } = require('./roadmap.data');

function generatePlantUmlScript(data, lang = 'ru', options = {}) {
    const { useShortSection = true, showHeaderTask = true, sortDirection = 'asc', useShortLabels = false } = options;

    const { tasks, groups, groupNames, groupMap, parseDateToNumber } = prepareRoadmapData(data, sortDirection);

    if (tasks.length === 0) {
        return '@startgantt\n[Нет данных]\n@endgantt';
    }

    let script = '@startgantt\n';
    script += 'skinparam svgDimensionStyle false\n';
    script += 'scale 1200 width\n';
    script += 'printscale monthly\n';

    const title = lang === 'ru' ? 'План релизов' : 'Release Plan';
    script += `title "${title}"\n\n`;

    let minStartDate = null;
    tasks.forEach(task => {
        const [month, year] = task.start.split('-');
        const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
        if (!minStartDate || dateStr < minStartDate) {
            minStartDate = dateStr;
        }
    });
    if (minStartDate) {
        script += `Project starts ${minStartDate}\n`;
    }

    groupNames.forEach((groupName, index) => {
        const groupData = groups[groupName];
        const taskList = groupData.tasks;
        const groupId = groupData.groupId;
        const groupObj = groupMap[groupId];

        const sectionName = useShortSection ? (lang === 'ru' ? 'Группа' : 'Group') + ` ${index + 1}` : groupName;
        script += `\n'--- ${sectionName} ---\n`;

        // 1. Вехи
        if (showHeaderTask) {
            const minStart = taskList.reduce(
                (min, t) => (parseDateToNumber(t.start) < parseDateToNumber(min) ? t.start : min),
                taskList[0].start
            );
            const [month, year] = minStart.split('-');
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            let milestoneLabel = useShortLabels ? `milestone_${index}` : groupName;

            script += `[${milestoneLabel}] happens at ${startDate}\n`;

            if (groupObj && groupObj.url) {
                script += `[${milestoneLabel}] links to [[${groupObj.url} ${milestoneLabel}]]\n`;
            }
        }

        // 2. Задачи
        taskList.forEach(task => {
            const [startMonth, startYear] = task.start.split('-');
            const [endMonth, endYear] = task.end.split('-');
            const monthsDiff =
                (parseInt(endYear) - parseInt(startYear)) * 12 + (parseInt(endMonth) - parseInt(startMonth));
            const days = Math.max(monthsDiff * 30, 1);
            const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;

            let label = useShortLabels ? task.id : task.name;

            script += `[${label}] starts ${startDate} and lasts ${days} days\n`;

            if (task.url) {
                script += `[${label}] links to [[${task.url} ${label}]]\n`;
            }
        });
    });

    script += '@endgantt\n';
    return script;
}

module.exports = {
    generatePlantUmlScript,
};
