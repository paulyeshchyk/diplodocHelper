const md_links_extract = require('../../../src/plugins/utils/md.links.extract');

describe('md.links.extract', () => {
    test('ExtractFigures should be defined', () => {
        expect(md_links_extract.ExtractFigures).toBeDefined();
    });
    test.todo('ExtractFigures should work correctly');
    test('ExtractMdLinks should be defined', () => {
        expect(md_links_extract.ExtractMdLinks).toBeDefined();
    });
    test.todo('ExtractMdLinks should work correctly');
});
