const fs = require('fs');
const path = require('path');

// Получаем аргументы: путь к папке и введенное название
const targetDir = process.argv[2]; 
const rawName = process.argv[3];

if (!rawName) {
    console.error("Имя раздела не введено!");
    process.exit(1);
}

// 1. Формируем имена
const folderName = rawName.replace(/\s+/g, ''); // Убираем пробелы
const sectionTitle = rawName;
const newFolderPath = path.join(targetDir, folderName);

// 2. Создаем папку
if (!fs.existsSync(newFolderPath)) {
    fs.mkdirSync(newFolderPath, { recursive: true });
}

// 3. Создаем index.md
const indexMdContent = `---
title: ${sectionTitle}
---
# ${sectionTitle}
`;
fs.writeFileSync(path.join(newFolderPath, 'index.md'), indexMdContent);

// 4. Создаем index.yaml
const indexYamlContent = `title: ${sectionTitle}
description: Описывает ${sectionTitle}
meta:
  title: ${sectionTitle}
  noIndex: true
`;
fs.writeFileSync(path.join(newFolderPath, 'index.yaml'), indexYamlContent);

// 5. Создаем toc.yaml (новый)
const tocYamlContent = `title: ${sectionTitle}
href: index.yaml
`;
fs.writeFileSync(path.join(newFolderPath, 'toc.yaml'), tocYamlContent);

// 6. Обновляем родительский toc.yaml
const parentTocPath = path.join(targetDir, 'toc.yaml');
if (fs.existsSync(parentTocPath)) {
    const entry = `
  - name: ${sectionTitle}
    href: ${folderName}/index.md
    include:
      path: ${folderName}/toc.yaml
      mode: link
`;
    fs.appendFileSync(parentTocPath, entry);
}

console.log(`Раздел "${sectionTitle}" успешно создан в ${folderName}`);