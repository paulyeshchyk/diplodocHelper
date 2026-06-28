const helpmap_writer = require('../../../src/plugins/helpMap/helpmap.writer');

describe('helpmap.writer', () => {
    test('writeHelpMap should be defined', () => {
        expect(helpmap_writer.writeHelpMap).toBeDefined();
    });
    test.todo('writeHelpMap should work correctly');
});
