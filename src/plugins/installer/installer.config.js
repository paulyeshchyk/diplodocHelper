/**
 * Конфигурация установщика клиентских скриптов.
 * 
 * src — путь относительно корня расширения (context.extensionPath).
 * dest — путь относительно папки, которую выберет пользователь.
 * 
 * Если src — папка, она скопируется рекурсивно.
 * Если src — файл, он скопируется с сохранением структуры.
 */
module.exports = {
    // Например, мы хотим перенести всю папку со скриптами сборки
    items: [
        {
            src: 'src/plugins',
            dest: './plugins' // Скопирует папку plugins целиком в <выбранная_папка>/plugins
        },
        {
            src: 'src/server',          // Серверная часть
            dest: './server'
        },
        {
            src: 'src/scripts/build-docs.js',
            dest: './build-docs.js' // Скопирует конкретный файл в корень
        },
        {
            src: 'src/scripts/utils',
            dest: './utils' // Скопирует папку utils
        },
        {
            src:  'src/plugins/docs-registry/emit-feature-map/feature-map.client.js',
            dest: './docs/_assets/scripts/feature-map.js',
        },
        {
            src:  'src/plugins/docs-registry/emit-feature-map/feature-map.css',
            dest: './docs/_assets/style/feature-map.css',
        },
    ],
    // Файлы, которые не нужно копировать (например, node_modules, тесты)
    ignorePatterns: [
        'node_modules',
        '.git',
        '.test.js',
        '.spec.js',
        'test',
    ]
};