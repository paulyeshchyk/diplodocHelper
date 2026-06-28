const _ontexts_collector = require('../../../src/plugins/contexts/сontexts.collector');

describe('сontexts.collector', () => {
    test('walkMdFilesGetContexts should be defined', () => {
        expect(_ontexts_collector.walkMdFilesGetContexts).toBeDefined();
    });
    test.todo('walkMdFilesGetContexts should work correctly');
});
