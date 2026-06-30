const link_utils = require('../../../src/plugins/utils/link.utils');

describe('link.utils', () => {
    test('generateSlug should be defined', () => {
        expect(link_utils.generateSlug).toBeDefined();
    });
    test.todo('generateSlug should work correctly');
    test('extractAnchorsFromMdFile should be defined', () => {
        expect(link_utils.extractAnchorsFromMdFile).toBeDefined();
    });
    test.todo('extractAnchorsFromMdFile should work correctly');
    test('promptAnchorSelection should be defined', () => {
        expect(link_utils.promptAnchorSelection).toBeDefined();
    });
    test.todo('promptAnchorSelection should work correctly');
    test('calculateRelativeMdPath should be defined', () => {
        expect(link_utils.calculateRelativeMdPath).toBeDefined();
    });
    test.todo('calculateRelativeMdPath should work correctly');
});
