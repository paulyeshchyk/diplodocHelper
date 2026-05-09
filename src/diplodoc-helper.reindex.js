const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml"); // Понадобится для работы с toc.yaml

/**
 * Рекурсивная переиндексация проекта
 * @param {string} dir Текущая директория
 * @param {string} parentIndex Индекс родителя (передается по рекурсии)
 */
function reindexDirectory(dir, parentIndex = "") {
    const INDEXED_TYPES = ["Part", "Section", "Chapter"];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    // Сначала отфильтруем только папки-разделы
    const sections = items.filter(item => {
        if (!item.isDirectory()) return false;
        const indexPath = path.join(dir, item.name, "index.md");
        return fs.existsSync(indexPath);
    });

    let localCounter = 0;

    for (const section of sections) {
        const sectionPath = path.join(dir, section.name);
        const indexPath = path.join(sectionPath, "index.md");
        
        let content = fs.readFileSync(indexPath, "utf8");
        
        // Извлекаем метаданные
        const type = getMetadataValue(content, "type") || "Page";
        const pureTitle = getMetadataValue(content, "pureTitle") || getMetadataValue(content, "title") || section.name;
        let currentIndex = getMetadataValue(content, "index");

        // Логика индексации
        if (INDEXED_TYPES.includes(type)) {
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
            const newTitle = `${currentIndex} ${pureTitle}`;

            // Обновляем файл index.md
            content = updateMetadata(content, "index", currentIndex);
            content = updateMetadata(content, "pureTitle", pureTitle);
            content = updateMetadata(content, "title", newTitle);
            fs.writeFileSync(indexPath, content, "utf8");

            // Обновляем оглавление (toc.yaml) в текущей папке (родительской для этого раздела)
            updateTocName(dir, section.name, newTitle);
        }

        // Рекурсивно идем вглубь (даже если это Page, у него могут быть вложенные Part)
        reindexDirectory(sectionPath, currentIndex || parentIndex);
    }
}

/** Вспомогательные функции */

function getMetadataValue(content, key) {
    const match = content.match(new RegExp(`${key}:\\s*(.*)`));
    return match ? match[1].trim().replace(/['"]/g, "") : null;
}

function updateMetadata(content, key, value) {
    const regex = new RegExp(`${key}:.*`);
    if (regex.test(content)) {
        return content.replace(regex, `${key}: ${value}`);
    } else {
        // Если ключа нет, вставляем после первой строки ---
        return content.replace(/---\n/, `---\n${key}: ${value}\n`);
    }
}

function updateTocName(parentDir, folderName, newName) {
    const tocPath = path.join(parentDir, "toc.yaml");
    if (!fs.existsSync(tocPath)) return;

    try {
        let doc = yaml.load(fs.readFileSync(tocPath, "utf8"));
        let changed = false;

        if (doc && doc.items) {
            doc.items.forEach(item => {
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
        console.error(`Ошибка при обновлении toc.yaml в ${parentDir}:`, e);
    }
}

module.exports = { reindexDirectory };