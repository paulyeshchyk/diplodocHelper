const contexts_extractor = require('../../../src/plugins/contexts/contexts.extractor');

describe('contexts.extractor', () => {
    test('extractContextTagValue should be defined', () => {
        expect(contexts_extractor.extractContextTagValue).toBeDefined();
    });
    test.todo('extractContextTagValue should work correctly');
    test('getTitleFromMDMetadata should be defined', () => {
        expect(contexts_extractor.getTitleFromMDMetadata).toBeDefined();
    });
    test.todo('getTitleFromMDMetadata should work correctly');
});
