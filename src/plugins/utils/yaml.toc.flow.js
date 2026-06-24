const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const yaml = require('js-yaml');

const { IndexYamlEntryPatchHRef } = require('./yaml.index.flow');
const { FrontMatterFiles, FrontMatterToc } = require('../model/frontmatter.model');
const frontMatterBuilder = require('./frontmatter.builder');

/**
 * @param {string} parentDir
 * @param {any} folderName
 */
function TocYamlEntryRemove(parentDir, folderName) {
    const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    // Читаем и парсим файл в объект
    const fileContent = fs.readFileSync(tocPath, 'utf8');
    const tocData = YAML.parse(fileContent) || {};

    // Если секции items нет или она пустая — делать нечего
    if (!tocData.items || !Array.isArray(tocData.items)) return;

    // Искомый href, который мы удаляем
    const targetHref = `${folderName}/${FrontMatterFiles.INDEX_MD}`;

    // Фильтруем массив, оставляя только те элементы, у которых href НЕ совпадает
    tocData.items = tocData.items.filter(
        (/** @type {{ [x: string]: string; }} */ item) => item[FrontMatterToc.ITEMS_HREF] !== targetHref
    );

    // Записываем обратно красивый YAML
    fs.writeFileSync(tocPath, YAML.stringify(tocData), 'utf8');
}

/**
 * @param {{ items: any; }} tocDoc
 * @param {any} folderName
 * @param {any} newName
 */
function TocYamlEntryPatch(tocDoc, folderName, newName) {
    if (!tocDoc?.items) return;
    for (const item of tocDoc.items) {
        if (item.href && item.href.includes(folderName)) {
            item.name = newName;
        }
    }
}
/**
 * Обновляет все ссылки на папку в родительском toc.yaml и index.yaml
 * @param {string} parentDir
 * @param {string | RegExp} oldFolderName
 * @param {string} newFolderName
 */
function TocYamlEntryPatchReference(parentDir, oldFolderName, newFolderName) {
    // Обновляем toc.yaml родителя
    const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
    if (fs.existsSync(tocPath)) {
        let content = fs.readFileSync(tocPath, 'utf8');
        content = content.replace(new RegExp(oldFolderName, 'g'), newFolderName);
        fs.writeFileSync(tocPath, content, 'utf8');
    }

    // Обновляем index.yaml родителя
    IndexYamlEntryPatchHRef(parentDir, oldFolderName, newFolderName, '');
}

/**
 * @param {string} parentDir
 * @param {string} composedTitle
 * @param {string} folderName
 * @param {any} sectionType
 * @param {string | undefined} sectionIndex
 */
function TocYamlEntryCreate(parentDir, composedTitle, folderName, sectionType, sectionIndex) {
    const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    const fileContent = fs.readFileSync(tocPath, 'utf8');
    const tocData = YAML.parse(fileContent) || {};

    // Инициализируем items, если файла не было или он был пустой
    if (!tocData.items || !Array.isArray(tocData.items)) {
        tocData.items = [];
    }

    // Собираем объект новой записи
    const newEntry = frontMatterBuilder.GET_INDEX_YAML_OBJECT_EXTENDED(composedTitle, folderName, sectionIndex);

    tocData.items.push(newEntry);

    fs.writeFileSync(tocPath, YAML.stringify(tocData), 'utf8');
}

/**
 * Ищет старую запись в TOC и заменяет её на новую на том же месте.
 * Если старая запись не найдена, добавляет в конец.
 * @param {string} parentDir
 * @param {string} oldFolderName
 * @param {string} composedTitle
 * @param {string} newFolderName
 * @param {string} sectionType
 * @param {any} sectionIndex
 */
function TocYamlEntryUpdateOrAppend(parentDir, oldFolderName, composedTitle, newFolderName, sectionType, sectionIndex) {
    const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    const fileContent = fs.readFileSync(tocPath, 'utf8');
    const tocData = YAML.parse(fileContent) || {};

    if (!tocData.items || !Array.isArray(tocData.items)) {
        tocData.items = [];
    }

    // Собираем объект обновленной/новой записи
    const updatedEntry = frontMatterBuilder.GET_TOC_YAML_OBJECT_EXT(composedTitle, newFolderName);

    // Строка, по которой мы идентифицируем старую запись в массиве
    const oldTargetHref = `${oldFolderName}/${FrontMatterFiles.INDEX_MD}`;

    // Ищем индекс элемента в массиве items
    const oldEntryIndex = tocData.items.findIndex(
        (/** @type {{ [x: string]: string; }} */ item) => item[FrontMatterToc.ITEMS_HREF] === oldTargetHref
    );

    if (oldEntryIndex !== -1) {
        // НАШЛИ! Заменяем старый элемент новым прямо на его позиции
        tocData.items[oldEntryIndex] = updatedEntry;
        console.log(`Запись успешно обновлена на позиции: ${oldEntryIndex}`);
    } else {
        // Не нашли (например, ручной сбой или добавление новой секции) -> пушим в конец
        tocData.items.push(updatedEntry);
        console.log(`Старая запись не найдена, добавлено в конец`);
    }

    // Сохраняем обратно в файл
    fs.writeFileSync(tocPath, YAML.stringify(tocData), 'utf8');
}

/**
 * Обновляет заголовок в toc.yaml раздела
 * @param {string} folderPath
 * @param {any} composedTitle
 */
function TocYamlEntryPatchTitle(folderPath, composedTitle) {
    const tocPath = path.join(folderPath, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    let content = fs.readFileSync(tocPath, 'utf8');
    const regex = /(title:\s*)(.*)/;
    content = content.replace(regex, `$1${composedTitle}`);
    fs.writeFileSync(tocPath, content, 'utf8');
}

/**
 * Вставляет запись в toc.yaml на строго указанную пользователем позицию
 * @param {string} targetDir - Куда перемещаем
 * @param {string} composedTitle - Сформированный заголовок
 * @param {string} folderName - Имя папки перемещаемой секции
 * @param {import('./yaml.base').YamlTocInsertPosition} positionObj - Выбранная позиция из QuickPick
 */
function TocYamlEntryInsertAtPosition(targetDir, composedTitle, folderName, positionObj) {
    const tocPath = path.join(targetDir, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    const fileContent = fs.readFileSync(tocPath, 'utf8');
    const tocData = YAML.parse(fileContent) || {};

    if (!tocData.items || !Array.isArray(tocData.items)) {
        tocData.items = [];
    }

    // Создаем объект новой записи
    const newEntry = frontMatterBuilder.GET_TOC_YAML_OBJECT_EXTEND_2(composedTitle, folderName);

    const pos = positionObj.position;

    if (pos === 'start') {
        // Вставляем в самое начало массива
        tocData.items.unshift(newEntry);
    } else if (pos === 'end') {
        // Вставляем в самый конец массива
        tocData.items.push(newEntry);
    } else if (pos === 'after' && positionObj.afterName) {
        // Ищем элемент, ПОСЛЕ которого нужно вставиться.
        // Целевой href в структуре выглядит как "ИмяПапки/index.md"
        const targetHref = `${positionObj.afterName}/${FrontMatterFiles.INDEX_MD}`;

        const targetIndex = tocData.items.findIndex(
            (/** @type {{ [x: string]: string; }} */ item) => item[FrontMatterToc.ITEMS_HREF] === targetHref
        );

        if (targetIndex !== -1) {
            // Вставляем НА СЛЕДУЮЩУЮ позицию после найденной (targetIndex + 1)
            // Метод splice(индекс, сколько_удалить, что_вставить)
            tocData.items.splice(targetIndex + 1, 0, newEntry);
        } else {
            // Если вдруг не нашли (например, файл изменился), фолбэчимся в конец
            tocData.items.push(newEntry);
        }
    }

    // Перезаписываем файл. Фреймворк сам разберется с отступами!
    fs.writeFileSync(tocPath, YAML.stringify(tocData), 'utf8');
}

/**
 * Передвигает элемент внутри одного и того же файла toc.yaml (репозиционирование)
 * @param {string} targetDir
 * @param {string} composedTitle
 * @param {string} folderName
 * @param {import('./yaml.base').YamlTocInsertPosition} positionObj
 */
function TocYamlEntryMoveWithinSameFile(targetDir, composedTitle, folderName, positionObj) {
    const tocPath = path.join(targetDir, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    const fileContent = fs.readFileSync(tocPath, 'utf8');
    const tocData = YAML.parse(fileContent) || {};

    if (!tocData.items || !Array.isArray(tocData.items)) return;

    const targetHref = `${folderName}/${FrontMatterFiles.INDEX_MD}`;

    // 1. Находим, где элемент лежит СЕЙЧАС, и извлекаем его из массива
    const currentIndex = tocData.items.findIndex(
        (/** @type {{ [x: string]: string; }} */ item) => item[FrontMatterToc.ITEMS_HREF] === targetHref
    );

    if (currentIndex === -1) {
        console.error('Элемент не найден в текущем TOC для перемещения');
        return;
    }

    // Удаляем элемент с его текущей позиции и сохраняем объект
    const [movingEntry] = tocData.items.splice(currentIndex, 1);

    // На всякий случай обновляем ему заголовок, если он вдруг параллельно изменился
    movingEntry[FrontMatterToc.ITEMS_NAME] = composedTitle;

    // 2. Вставляем обратно на НОВУЮ позицию
    const pos = positionObj.position;

    if (pos === 'start') {
        tocData.items.unshift(movingEntry);
    } else if (pos === 'end') {
        tocData.items.push(movingEntry);
    } else if (pos === 'after' && positionObj.afterName) {
        // Ищем индекс элемента, ПОСЛЕ которого нужно встать (уже в уменьшенном массиве!)
        const afterHref = `${positionObj.afterName}/${FrontMatterFiles.INDEX_MD}`;
        const afterIndex = tocData.items.findIndex(
            (/** @type {{ [x: string]: string; }} */ item) => item[FrontMatterToc.ITEMS_HREF] === afterHref
        );

        if (afterIndex !== -1) {
            tocData.items.splice(afterIndex + 1, 0, movingEntry);
        } else {
            // Фолбэк, если цель не найдена
            tocData.items.push(movingEntry);
        }
    }

    // Сохраняем файл
    fs.writeFileSync(tocPath, YAML.stringify(tocData), 'utf8');
}

/**
 * @param {string} absoluteTocPath
 * @returns {import('./yaml.base').TocYamlItem[]}
 */
function getTocYamlItems(absoluteTocPath) {
    try {
        const tocDoc = TocYamlFileLoad(absoluteTocPath);
        return tocDoc.items || [];
    } catch (err) {
        console.error(`Ошибка загрузки ${absoluteTocPath}:`, err);
        return [];
    }
}

/**
 * @param {fs.PathOrFileDescriptor} tocPath
 * @returns {import('./yaml.base').TocYaml}
 */
function TocYamlFileLoad(tocPath) {
    const content = fs.readFileSync(tocPath, 'utf8');
    return /** @type {import('./yaml.base').TocYaml} */ (yaml.load(content));
}

/**
 * @param {fs.PathOrFileDescriptor} tocPath
 * @param {any} tocDoc
 */
function TocYamlFileSave(tocPath, tocDoc) {
    fs.writeFileSync(tocPath, yaml.dump(tocDoc, { lineWidth: -1, noArrayIndent: true }));
}

module.exports = {
    getTocYamlItems,
    TocYamlEntryRemove,
    TocYamlEntryPatchReference,
    TocYamlEntryCreate,
    TocYamlEntryUpdateOrAppend,
    TocYamlEntryPatch,
    TocYamlEntryPatchTitle,
    TocYamlEntryInsertAtPosition,
    TocYamlEntryMoveWithinSameFile,
    TocYamlFileSave,
};
