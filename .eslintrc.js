module.exports = {
    plugins: ['jsdoc', 'import'],
    rules: {
        // ... другие правила
        // 'import/no-unresolved': 'error', // путь существует?
        'import/named': 'error', // именованный экспорт существует?
        'import/default': 'error', // экспорт по умолчанию существует?
        'import/namespace': 'error', // корректное использование пространства имён
        'import/export': 'error', // корректный экспорт
        'import/no-named-as-default-member': 'warn',
        'import/no-named-as-default': 'warn',
        'import/no-unresolved': ['error', { caseSensitive: true, commonjs: true }],
    },
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.json'],
            },
        },
    },
};
