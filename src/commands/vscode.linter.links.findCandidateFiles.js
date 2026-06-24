const path = require('path');
const fs = require('fs');

/**
 * Поиск кандидатов для замены битой ссылки с учётом иерархии проекта
 * @param {string} brokenLink - битая ссылка (из диагностики, уже раскодированная)
 * @param {string} currentFilePath - абсолютный путь к текущему файлу
 * @param {string[]} allMdFiles - все .md-файлы проекта
 * @param {string} rootDir - корневая директория проекта
 * @returns {string[]} - массив абсолютных путей к кандидатам
 */
function findCandidateFiles(brokenLink, currentFilePath, allMdFiles, rootDir) {
    // 1. Извлекаем путь без якоря
    const hashIndex = brokenLink.indexOf('#');
    const linkPath = hashIndex !== -1 ? brokenLink.substring(0, hashIndex) : brokenLink;
    // 2. Разбиваем на сегменты
    const segments = linkPath.split('/').filter(s => s !== '');
    if (segments.length === 0) return [];

    // 3. Определяем, что ищем: файл или папку
    const lastSeg = segments[segments.length - 1];
    const isIndex = lastSeg === 'index.md';
    let searchName;
    if (isIndex) {
        // Если ссылка заканчивается на index.md, то ищем папку с именем предпоследнего сегмента
        if (segments.length < 2) return [];
        searchName = segments[segments.length - 2];
    } else {
        // Иначе ищем файл с именем lastSeg без расширения
        searchName = lastSeg.replace(/\.md$/, '');
    }

    if (!searchName) return [];

    const currentDir = path.dirname(currentFilePath);
    const candidatesSet = new Set();

    // 4. Поиск по всем файлам проекта
    if (isIndex) {
        // Ищем файлы, у которых родительская папка равна searchName (без учёта регистра)
        for (const file of allMdFiles) {
            const dirName = path.basename(path.dirname(file));
            if (dirName.toLowerCase() === searchName.toLowerCase()) {
                candidatesSet.add(file);
            }
        }
    } else {
        // Ищем файлы с именем searchName (без учёта регистра)
        for (const file of allMdFiles) {
            const base = path.basename(file, '.md');
            if (base.toLowerCase() === searchName.toLowerCase()) {
                candidatesSet.add(file);
            }
        }
    }

    // 5. Если кандидатов нет, выполняем поиск вверх по иерархии
    if (candidatesSet.size === 0) {
        let searchDir = currentDir;
        while (searchDir && path.relative(rootDir, searchDir) !== '') {
            try {
                const entries = fs.readdirSync(searchDir, { withFileTypes: true });
                for (const entry of entries) {
                    if (isIndex) {
                        // Ищем папку с именем searchName, внутри которой есть index.md
                        if (entry.isDirectory() && entry.name.toLowerCase() === searchName.toLowerCase()) {
                            const indexPath = path.join(searchDir, entry.name, 'index.md');
                            if (fs.existsSync(indexPath)) {
                                candidatesSet.add(indexPath);
                            }
                        }
                    } else {
                        // Ищем файл с именем searchName.md
                        if (entry.isFile() && entry.name.toLowerCase() === searchName + '.md') {
                            candidatesSet.add(path.join(searchDir, entry.name));
                        }
                    }
                }
            } catch (err) {
                console.error(`findCandidateFiles error: ${err}`);
                // Игнорируем ошибки доступа
            }
            const parent = path.dirname(searchDir);
            if (parent === searchDir) break;
            searchDir = parent;
        }
    }

    // 6. Сортируем по близости к текущему файлу
    const candidates = Array.from(candidatesSet);
    candidates.sort((a, b) => {
        const relA = path.relative(currentDir, a);
        const relB = path.relative(currentDir, b);
        const depthA = relA.split(path.sep).length;
        const depthB = relB.split(path.sep).length;
        if (depthA !== depthB) return depthA - depthB;
        return a.localeCompare(b);
    });

    return candidates;
}

module.exports = { findCandidateFiles };
