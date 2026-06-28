const reindexer_md = require('../../../src/plugins/reindexer/reindexer.md');

describe('reindexer.md', () => {
    test('calculateNextIndex should be defined', () => {
        expect(reindexer_md.calculateNextIndex).toBeDefined();
    });
    test.todo('calculateNextIndex should work correctly');
});
