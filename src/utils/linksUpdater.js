const vscode = require('vscode');
const path = require('path');
const fs = require('fs').promises;
const { updateLinksInContent } = require('./markdownLinkUpdater');

/**
 * Обновляет ссылки на переименованный раздел и все его подразделы/файлы
 * @param {string} oldFolder - старый абсолютный путь к папке раздела (без слеша в конце)
 * @param {string} newFolder - новый абсолютный путь
 * @param {string} projectRoot - корень документации (где лежит toc.yaml)
 * @returns {Promise<number>} количество обновлённых файлов
 */
async function updateLinksAfterRename(oldFolder, newFolder, projectRoot) {
  const allMdFiles = await vscode.workspace.findFiles(
    new vscode.RelativePattern(projectRoot, '**/*.md'),
    '**/node_modules/**'
  );
  let updatedCount = 0;

  for (const fileUri of allMdFiles) {
    const filePath = fileUri.fsPath;
    // Пропускаем файлы внутри переименовываемого раздела (их относительные ссылки не меняются)
    if (filePath.startsWith(oldFolder + path.sep)) continue;

    let content = await fs.readFile(filePath, 'utf8');
    let newContent = updateLinksInContent(content, filePath, oldFolder, newFolder);
    if (newContent !== content) {
      await fs.writeFile(filePath, newContent, 'utf8');
      updatedCount++;
    }
  }
  return updatedCount;
}

module.exports = { updateLinksAfterRename };
