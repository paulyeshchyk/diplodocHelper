const contexts_writer = require('../../../src/plugins/contexts/contexts.writer');

describe('contexts.writer', () => {
    test('writeTermFiles should be defined', () => {
        expect(contexts_writer.writeTermFiles).toBeDefined();
    });
    test.todo('writeTermFiles should work correctly');
    test('writeIndexMd should be defined', () => {
        expect(contexts_writer.writeIndexMd).toBeDefined();
    });
    test.todo('writeIndexMd should work correctly');
    test('writeTocAndIndexYaml should be defined', () => {
        expect(contexts_writer.writeTocAndIndexYaml).toBeDefined();
    });
    test.todo('writeTocAndIndexYaml should work correctly');
});
