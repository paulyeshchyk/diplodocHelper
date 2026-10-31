'use strict';

// Обратная совместимость: старый путь сохранён.
// Вся логика теперь в ./run-generation.js.

const { runGeneration, parseArgs } = require('./run-generation');

if (require.main === module) {
    runGeneration(parseArgs(process.argv.slice(2)));
} else {
    module.exports = require('./run-generation');
}