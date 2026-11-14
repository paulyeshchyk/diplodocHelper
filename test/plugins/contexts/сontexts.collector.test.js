const _ontexts_collector = require('../../../src/plugins/contexts/contexts.collector');

describe('contexts.collector', () => {
    test('walkMdFilesGetContexts should be defined', () => {
        expect(_ontexts_collector.walkMdFilesGetContexts).toBeDefined();
    });
    test.todo('walkMdFilesGetContexts should work correctly');
});
