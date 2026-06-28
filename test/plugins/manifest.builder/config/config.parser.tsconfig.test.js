const config_parser_tsconfig = require('../../../../src/plugins/manifest.builder/config/config.parser.tsconfig');

describe('config.parser.tsconfig', () => {
    test('TsConfigParser should be defined', () => {
        expect(config_parser_tsconfig.TsConfigParser).toBeDefined();
    });
    test.todo('TsConfigParser should work correctly');
});
