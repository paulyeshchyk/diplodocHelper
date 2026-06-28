const helpmap_extractor = require('../../../src/plugins/helpMap/helpmap.extractor');

describe('helpmap.extractor', () => {
    test('collectHelpData should be defined', () => {
        expect(helpmap_extractor.collectHelpData).toBeDefined();
    });
    test.todo('collectHelpData should work correctly');
});
