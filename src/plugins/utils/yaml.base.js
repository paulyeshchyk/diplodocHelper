const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const yaml = require('js-yaml');
const { FrontMatterFiles } = require('../model');
const frontmatterBuilder = require('./frontmatter.builder');

/** @typedef {Object} TocYamlItemInclude
 * @property {string} path
 */

/** @typedef {Object} TocYamlItem
 * @property {string | undefined} href
 * @property {TocYamlItemInclude | undefined} include
 */

/** @typedef {Object} TocYaml
 * @property {TocYamlItem[] | undefined} items
 */

/**
 * @typedef {Object} YamlTocInsertPosition
 * @property {string} label - Текст для QuickPick
 * @property {string} position - Куда именно вставляем
 * @property {string} [afterName] - Имя папки, ПОСЛЕ которой нужно вставить (если position === 'after')
 */

/**
 * @param {string} folderPath
 * @param {any} title
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function TocYamlFileCreate(folderPath, title, sectionLabel, sectionIndex) {
    const filePath = path.join(folderPath, FrontMatterFiles.TOC_YAML);
    const obj = frontmatterBuilder.GET_TOC_YAML_OBJECT(title, sectionLabel, sectionIndex);

    fs.writeFileSync(filePath, YAML.stringify(obj), 'utf8');
}
/**
 * @param {string} folderPath
 * @param {any} title
 * @param {any} sectionType
 * @param {any} sectionLabel
 * @param {any} sectionIndex
 */
function IndexYamlFileCreate(folderPath, title, sectionType, sectionLabel, sectionIndex) {
    const filePath = path.join(folderPath, FrontMatterFiles.INDEX_YAML);
    const obj = frontmatterBuilder.GET_INDEX_YAML_OBJECT(title, sectionType, sectionLabel, sectionIndex);

    // Переводим объект в YAML-строку
    fs.writeFileSync(filePath, YAML.stringify(obj), 'utf8');
}

/**
 * @param {string} parentDir
 * @param {string} sectionTitle
 * @param {string} sectionTypeLabel
 * @param {string} folderName
 * @param {string | undefined} sectionIndex
 */
function TocYamlEntryPatchItems(parentDir, sectionTitle, sectionTypeLabel, folderName, sectionIndex) {
    const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    // 1. Читаем старый файл
    const fileContent = fs.readFileSync(tocPath, 'utf8');

    // 2. Парсим его в JS-объект. Если файл пустой, создаем пустой объект
    let tocData = YAML.parse(fileContent) || {};

    // 3. Проверяем, есть ли уже поле items и является ли оно массивом
    if (!tocData.items || !Array.isArray(tocData.items)) {
        tocData.items = [];
    }

    // 4. Генерируем новый элемент и просто пушим его в массив
    const newItem = frontmatterBuilder.GET_PARENT_TOC_ITEM_OBJECT(
        sectionTitle,
        sectionTypeLabel,
        folderName,
        sectionIndex
    );
    tocData.items.push(newItem);

    // 5. Перезаписываем файл. Библиотека сама сделает правильные отступы (- name:)
    fs.writeFileSync(tocPath, YAML.stringify(tocData), 'utf8');
}

/**
 * @param {string} folderPath
 * @param {any} title
 * @param {any} sectionType
 * @param {any} sectionValue
 * @param {any} sectionIndex
 */
function IndexMdFileCreate(folderPath, title, sectionType, sectionValue, sectionIndex) {
    const filePath = path.join(folderPath, FrontMatterFiles.INDEX_MD);

    // Создаем JS-объект для метаданных
    const metaObj = frontmatterBuilder.GET_INDEX_MD_OBJECT(sectionValue, sectionIndex, title, sectionType);

    const frontMatter = `---\n${YAML.stringify(metaObj)}---`;

    fs.writeFileSync(filePath, frontMatter, 'utf8');
}

/**
 * Полностью обновляет index.yaml согласно новым данным от техписа
 * @param {string} folderPath - путь к папке с index.yaml
 * @param {string} newPureTitle - чистое название
 * @param {Object} newSectionType - объект с label и name
 * @param {string|undefined} userIndex - индекс (например "14")
 */
function IndexYamlEntryPatch(folderPath, newPureTitle, newSectionType, userIndex = '') {
    const yamlPath = path.join(folderPath, 'index.yaml');
    if (!fs.existsSync(yamlPath)) {
        console.warn(`index.yaml не найден: ${yamlPath}`);
        return;
    }

    let content = fs.readFileSync(yamlPath, 'utf8');
    let data;

    try {
        data = yaml.load(content);
    } catch (e) {
        console.error(`Ошибка парсинга YAML: ${yamlPath}`, e.message);
        return;
    }

    // === 1. Формируем composed title ===
    const sectionIndex = userIndex?.trim() || '';
    const composedTitle = sectionIndex ? `${newSectionType.value} ${sectionIndex}. ${newPureTitle}` : newPureTitle;

    // === 2. Обновляем корневые поля ===
    data.title = composedTitle;

    // Обновляем description (по твоему примеру)
    data.description = `Описывает ${composedTitle}`;

    // === 3. Обновляем meta ===
    if (!data.meta) data.meta = {};

    data.meta.title = composedTitle; // или newPureTitle — как нужно
    data.meta.sectionType = newSectionType.name; // "Chapter"
    data.meta.sectionIndex = sectionIndex;

    // pureTitle тоже сохраняем (полезно)
    data.pureTitle = newPureTitle;

    // === 4. Сохраняем с сохранением порядка и форматирования ===
    const updatedContent = yaml.dump(data, {
        lineWidth: -1, // не переносить длинные строки
        noRefs: true,
        sortKeys: false, // сохраняем порядок ключей
        quotingType: '"', // кавычки как в оригинале
    });

    fs.writeFileSync(yamlPath, updatedContent, 'utf8');
    console.log(`✅ index.yaml обновлён: ${composedTitle}`);
}
module.exports = {
    TocYamlEntryPatchItems,
    TocYamlFileCreate,
    IndexYamlFileCreate,
    IndexYamlEntryPatch,
    IndexMdFileCreate,
};
