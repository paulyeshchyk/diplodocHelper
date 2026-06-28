const encoding_slugify = require('../../../src/plugins/utils/encoding.slugify');

describe('encoding.slugify', () => {
    test('slugify_diplodoc_reference should be defined', () => {
        expect(encoding_slugify.slugify_diplodoc_reference).toBeDefined();
    });
    test.todo('slugify_diplodoc_reference should work correctly');
    test('slugify_filename should be defined', () => {
        expect(encoding_slugify.slugify_filename).toBeDefined();
    });
    test.todo('slugify_filename should work correctly');
    test('slugify_latin should be defined', () => {
        expect(encoding_slugify.slugify_latin).toBeDefined();
    });
    test.todo('slugify_latin should work correctly');
    test('slugify_latin_alphanumeric should be defined', () => {
        expect(encoding_slugify.slugify_latin_alphanumeric).toBeDefined();
    });
    test.todo('slugify_latin_alphanumeric should work correctly');
});
