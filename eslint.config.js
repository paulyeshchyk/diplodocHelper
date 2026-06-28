// eslint.config.js
const js = require('@eslint/js');
const globals = require('globals');
const importPlugin = require('eslint-plugin-import');
const jsdocPlugin = require('eslint-plugin-jsdoc');

module.exports = [
    {
        ignores: ['**/breadcrumb.template.js', '**/dist/extension.js', '**/*.test.js'],
    },
    js.configs.recommended,
    {
        files: ['**/*.js', '**/*.cjs', '**/*.mjs'], // явно указываем
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
            },
            sourceType: 'commonjs', // если ваш проект использует require/module.exports
        },
        plugins: {
            import: importPlugin,
            jsdoc: jsdocPlugin,
        },
        rules: {
            // Включаем проверку импортов
            'import/no-unresolved': [
                'error',
                {
                    commonjs: true,
                    amd: false,
                    ignore: ['^vscode$'], // игнорируем встроенный модуль vscode
                },
            ],
            'import/named': 'error',
            'import/default': 'error',
            'import/namespace': 'error',
            'import/export': 'error',
            'import/no-named-as-default-member': 'warn',
            'import/no-named-as-default': 'warn',
            // другие правила
            'no-unused-vars': 'off',
            'no-useless-escape': 'off',
        },
        settings: {
            'import/resolver': {
                node: {
                    extensions: ['.js', '.json', '.cjs', '.mjs'],
                },
            },
        },
    },
];
