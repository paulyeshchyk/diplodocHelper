const section_model = require('../../../src/plugins/model/section.model');

describe('section.model', () => {
    test('sectionTypes should be defined', () => {
        expect(section_model.sectionTypes).toBeDefined();
    });
    test.todo('sectionTypes should work correctly');
});
