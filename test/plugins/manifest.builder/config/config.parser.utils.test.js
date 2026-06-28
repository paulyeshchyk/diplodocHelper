const config_parser_utils = require('../../../../src/plugins/manifest.builder/config/config.parser.utils');

describe('config.parser.utils', () => {
    test('getDefaultByType should be defined', () => {
        expect(config_parser_utils.getDefaultByType).toBeDefined();
    });
    test.todo('getDefaultByType should work correctly');
    test('normalizeType should be defined', () => {
        expect(config_parser_utils.normalizeType).toBeDefined();
    });
    test.todo('normalizeType should work correctly');
    test('parseDefaultValue should be defined', () => {
        expect(config_parser_utils.parseDefaultValue).toBeDefined();
    });
    test.todo('parseDefaultValue should work correctly');
    test('parseTypeScriptType should be defined', () => {
        expect(config_parser_utils.parseTypeScriptType).toBeDefined();
    });
    test.todo('parseTypeScriptType should work correctly');
    test('cleanJSDocComment should be defined', () => {
        expect(config_parser_utils.cleanJSDocComment).toBeDefined();
    });
    test.todo('cleanJSDocComment should work correctly');
});
