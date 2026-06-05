// // src/pasteProvider.js
// const vscode = require('vscode');
// const path = require('path');

// class PasteImageProvider {
//     /**
//      * @param {vscode.TextDocument} document
//      * @param {readonly vscode.Range[]} ranges
//      * @param {vscode.DataTransfer} dataTransfer
//      * @param {vscode.DocumentPasteEditContext} context
//      * @param {vscode.CancellationToken} token
//      * @returns {Promise<vscode.DocumentPasteEdit[] | undefined>}
//      */
//     async provideDocumentPasteEdits(document, ranges, dataTransfer, context, token) {
//         // Ищем в буфере обмена файл изображения
//         const imageItem =
//             dataTransfer.get('image/png') || dataTransfer.get('image/jpeg') || dataTransfer.get('image/gif');

//         if (!imageItem) {
//             return undefined;
//         }

//         // Получаем файл изображения
//         const imageFile = await imageItem.asFile();
//         if (!imageFile) {
//             console.error('Не удалось получить файл изображения из буфера обмена');
//             return undefined;
//         }

//         // Читаем данные файла
//         const imageData = await imageFile.data();

//         // Определяем рабочую область и генерируем пути
//         const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
//         if (!workspaceFolder) {
//             console.error('Не удалось определить корень рабочей области');
//             return undefined;
//         }

//         const fileName = `image_${Date.now()}.png`;
//         const imageFolderUri = vscode.Uri.joinPath(workspaceFolder.uri, 'images');
//         const imageFileUri = vscode.Uri.joinPath(imageFolderUri, fileName);

//         // Создаём папку, если её нет
//         try {
//             await vscode.workspace.fs.createDirectory(imageFolderUri);
//         } catch (err) {
//             // Папка, вероятно, уже существует — игнорируем
//         }

//         // Сохраняем файл изображения
//         await vscode.workspace.fs.writeFile(imageFileUri, imageData);

//         // Формируем Markdown-ссылку для вставки
//         const relativePath = path.relative(path.dirname(document.uri.fsPath), imageFileUri.fsPath);
//         const insertText = `![${fileName}](${relativePath})`;

//         // Создаём объект редактирования
//         const pasteEdit = new vscode.DocumentPasteEdit(
//             insertText, // Текст для вставки
//             'undefined', // Дополнительные правки (не требуются)
//             'Вставить изображение из буфера' // Поясняющая подпись
//         );

//         return [pasteEdit];
//     }
// }

// module.exports = { PasteImageProvider };
