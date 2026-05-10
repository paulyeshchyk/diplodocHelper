// diplodoc-helper.reindex.js
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const {  sectionTypes} = require("./diplodoc-helper.section.utils");
const { FrontMatterMeta, FrontMatterFiles, FrontMatterSectionTypes, FrontMatterSectionTypesIndexed } = require("./diplodoc-helper.constants");

/**
 * @typedef {Object} TocItem
 * @property {string} name
 * @property {string} href
 * @property {string} [include]      // если в toc.yaml есть поле include (опционально)
 * @property {any} [items]           // для возможной вложенности
 */

/**
 * @typedef {Object} TocDocument
 * @property {TocItem[]} [items]
 */

/**
 * Рекурсивная переиндексация проекта
 * @param {string} dir Текущая директория
 * @param {string} parentIndex Индекс родителя (передается по рекурсии)
 */
function reindexDirectory(dir, parentIndex = "") {

    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    // Сначала отфильтруем только папки-разделы
    const sections = items.filter(item => {
        if (!item.isDirectory()) return false;
        const indexPath = path.join(dir, item.name, FrontMatterFiles.INDEX_MD);
        return fs.existsSync(indexPath);
    });

    const localSectionTypes = sectionTypes();

    let localCounter = 0;

    for (const section of sections) {
        const sectionPath = path.join(dir, section.name);
        const indexPath = path.join(sectionPath, FrontMatterFiles.INDEX_MD);
        
        let content = fs.readFileSync(indexPath, "utf8");
        
        // Извлекаем метаданные
        const sectionType = getMetadataValue(content, FrontMatterMeta.SECTIONTYPE) || FrontMatterSectionTypes.PAGE;
        const pureTitle = getMetadataValue(content, FrontMatterMeta.PURETITLE) || getMetadataValue(content, FrontMatterMeta.TITLE) || section.name;
        let currentIndex = getMetadataValue(content, FrontMatterMeta.SECTIONINDEX);

        // Логика индексации
        if (FrontMatterSectionTypesIndexed.includes(sectionType)) {
            // Если индекса нет — вычисляем новый
            if (!currentIndex) {
                localCounter++;
                currentIndex = parentIndex ? `${parentIndex}.${localCounter}` : `${localCounter}`;
            } else {
                // Если индекс есть, обновляем локальный счетчик, чтобы следующие шли за ним
                const parts = currentIndex.split(".");
                const lastNum = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(lastNum)) localCounter = lastNum;
            }

            // Формируем новый заголовок
            const localSection = localSectionTypes.find(st => st.name == sectionType);
            const sectionLabel = localSection?.label || "";
            
            const newTitle = `${sectionLabel} ${currentIndex}. ${pureTitle}`;

            console.log(`sectiontype:${sectionType}; sectionlabel:${sectionLabel}; newTitle:${newTitle}`);
            
            // Обновляем файл index.md
            content = updateMetadata(content, FrontMatterMeta.SECTIONINDEX, currentIndex);
            content = updateMetadata(content, FrontMatterMeta.PURETITLE, pureTitle);
            content = updateMetadata(content, FrontMatterMeta.TITLE, newTitle);
            fs.writeFileSync(indexPath, content, "utf8");

            // Обновляем оглавление (toc.yaml) в текущей папке (родительской для этого раздела)
            updateTocName(dir, section.name, newTitle);
        }

        // Рекурсивно идем вглубь (даже если это Page, у него могут быть вложенные Part)
        reindexDirectory(sectionPath, currentIndex || parentIndex);
    }
}

// --- Вспомогательные функции ---

/** 
 * @param {string} content
 * @param {string} key
 */
function getMetadataValue(content, key) {
    const match = content.match(new RegExp(`${key}:\\s*(.*)`));
    return match ? match[1].trim().replace(/['"]/g, "") : null;
}


/**
 * @param {fs.PathOrFileDescriptor} tocPath
 * @returns {TocDocument}
 */
function LoadToc(tocPath) {
    const content = fs.readFileSync(tocPath, "utf8");
    return /** @type {TocDocument} */ (yaml.load(content));
}
/**
 * @param {string} content
 * @param {string} key
 * @param {string} value
 */
function updateMetadata(content, key, value) {
    const regex = new RegExp(`${key}:.*`);
    if (regex.test(content)) {
        return content.replace(regex, `${key}: ${value}`);
    } else {
        // Если ключа нет, вставляем после первой строки ---
        return content.replace(/---\n/, `---\n${key}: ${value}\n`);
    }
}

/**
 * @param {string} parentDir
 * @param {string} folderName
 * @param {string} newName
 */
function updateTocName(parentDir, folderName, newName) {
    const tocPath = path.join(parentDir, FrontMatterFiles.TOC_YAML);
    if (!fs.existsSync(tocPath)) return;

    try {
        let doc = LoadToc(tocPath);
        let changed = false;

        if (doc && doc.items) {
            doc.items.forEach(( /** @type {TocItem} */ item) => {
                // Проверяем, если href ведет в эту папку
                if (item.href && (item.href === folderName || item.href.startsWith(folderName + "/"))) {
                    item.name = newName;
                    changed = true;
                }
            });
        }

        if (changed) {
            fs.writeFileSync(tocPath, yaml.dump(doc, { lineWidth: -1, noArrayIndent: true }));
        }
    } catch (e) {
        console.error(`Ошибка при обновлении ${FrontMatterFiles.TOC_YAML} в ${parentDir}:`, e);
    }
}

module.exports = { reindexDirectory };