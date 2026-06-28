const diplodoc_helper_links_coder = require('../../src/commands/diplodoc-helper.links.coder');

describe('diplodoc-helper.links.coder', () => {
    test('decodeLinkPath should be defined', () => {
        expect(diplodoc_helper_links_coder.decodeLinkPath).toBeDefined();
    });
    test.todo('decodeLinkPath should work correctly');
    test('encodePathSegments should be defined', () => {
        expect(diplodoc_helper_links_coder.encodePathSegments).toBeDefined();
    });
    test.todo('encodePathSegments should work correctly');
});
