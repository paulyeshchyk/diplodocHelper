const reindexer_directories = require('../../../src/plugins/reindexer/reindexer.directories');

describe('reindexer.directories', () => {
    test('reindexDirectory should be defined', () => {
        expect(reindexer_directories.reindexDirectory).toBeDefined();
    });
    test.todo('reindexDirectory should work correctly');
});
