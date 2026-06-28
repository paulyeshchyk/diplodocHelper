const diplodoc_flow = require('../../../src/plugins/utils/diplodoc.flow');

describe('diplodoc.flow', () => {
    test('createSectionFolder should be defined', () => {
        expect(diplodoc_flow.createSectionFolder).toBeDefined();
    });
    test.todo('createSectionFolder should work correctly');
    test('DiplodocSectionRefresh should be defined', () => {
        expect(diplodoc_flow.DiplodocSectionRefresh).toBeDefined();
    });
    test.todo('DiplodocSectionRefresh should work correctly');
    test('DiplodocSectionPatch should be defined', () => {
        expect(diplodoc_flow.DiplodocSectionPatch).toBeDefined();
    });
    test.todo('DiplodocSectionPatch should work correctly');
});
