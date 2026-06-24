const fs = require('fs');
const path = require('path');

/**
 * Собирает все .md-файлы и папки с index.md для отображения в иерархическом виде
 * @param {string} rootDir - корневая директория проекта
 * @param {string} currentFilePath - путь к текущему документу (для расчёта относительных путей)
 * @param {string[]} highlightPaths - опциональный список путей, которые следует пометить
 * @returns {Array<{ label: string, description: string, filePath: string, isDirectory: boolean }>}
 */
function collectLinkTargets(rootDir, currentFilePath, highlightPaths = []) {
    /**
     * @type {{ label: string; description: string; filePath: string; isDirectory: boolean; }[] | { label: string; description: string; filePath: any; isDirectory: boolean; isTarget: boolean; }[]}
     */
    const targets = [];
    const currentDir = path.dirname(currentFilePath);
    const highlightSet = new Set(highlightPaths.map(p => path.resolve(p)));

    /**
     * @param {string} dir
     */
    function walk(dir, level = 0) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        const dirs = entries.filter(e => e.isDirectory());
        const files = entries.filter(e => e.isFile() && (e.name.endsWith('.md') || e.name === 'index.md'));

        // Проверяем, есть ли в текущей папке index.md или другие .md-файлы
        const hasIndex = fs.existsSync(path.join(dir, 'index.md'));
        const hasMdFiles = files.some(f => f.name !== 'index.md');

        // Добавляем саму папку, если она имеет отношение к документации
        if (hasIndex || hasMdFiles) {
            const relPath = path.relative(currentDir, dir);
            const isHighlighted = highlightSet.has(dir);
            const labelPrefix = isHighlighted ? '⭐ ' : hasIndex ? '📁 ' : '📂 ';
            targets.push({
                label: '  '.repeat(level) + labelPrefix + path.basename(dir),
                description: relPath || './',
                filePath: dir,
                isDirectory: true,
                isTarget: hasIndex, // только папки с index.md можно выбрать как цель
            });
        }

        // Рекурсивный обход вложенных папок (уровень увеличивается)
        for (const dirEntry of dirs) {
            walk(path.join(dir, dirEntry.name), level + 1);
        }

        // Добавляем .md-файлы (кроме index.md) с отступом на уровень глубже
        for (const fileEntry of files) {
            if (fileEntry.name === 'index.md') continue;
            const fullPath = path.join(dir, fileEntry.name);
            const relPath = path.relative(currentDir, fullPath);
            const isHighlighted = highlightSet.has(fullPath);
            targets.push({
                label: '  '.repeat(level + 1) + (isHighlighted ? '⭐ ' : '📄 ') + fileEntry.name,
                description: relPath || './',
                filePath: fullPath,
                isDirectory: false,
                isTarget: true,
            });
        }
    }

    walk(rootDir);
    return targets;
}
exports.collectLinkTargets = collectLinkTargets;
