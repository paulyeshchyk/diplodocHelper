const md_links_figure = require('../../../src/plugins/utils/md.links.figure');

describe('md.links.figure', () => {
    test('buildFigure should be defined', () => {
        expect(md_links_figure.buildFigure).toBeDefined();
    });
    test.todo('buildFigure should work correctly');
    test('buildFigureId should be defined', () => {
        expect(md_links_figure.buildFigureId).toBeDefined();
    });
    test.todo('buildFigureId should work correctly');
    test('buildImageLink should be defined', () => {
        expect(md_links_figure.buildImageLink).toBeDefined();
    });
    test.todo('buildImageLink should work correctly');
});
