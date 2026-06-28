const diplodoc_helper_links_coder = require('../../src/commands/diplodoc-helper.links.coder');

describe('diplodoc-helper.links.coder', () => {
    test('decodeLinkPath should be defined', () => {
        expect(diplodoc_helper_links_coder.decodeLinkPath).toBeDefined();
    });
    test.todo('decodeLinkPath should work correctly');
    test('encodePathSegments should be defined', () => {
        expect(diplodoc_helper_links_coder.encodePathSegments).toBeDefined();
    });
    test('encodePath sample 1', () => {
        const value = diplodoc_helper_links_coder.encodePathSegments('loremИпсум');
        expect(value).toEqual('lorem%D0%98%D0%BF%D1%81%D1%83%D0%BC');
    });

    test.todo('encodePathSegments should work correctly');
});
