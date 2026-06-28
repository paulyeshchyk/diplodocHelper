const post_build = require('../../../src/plugins/tocCleanMode/post-build');

describe('post-build', () => {
    test('injectCleanMode should be defined', () => {
        expect(post_build.injectCleanMode).toBeDefined();
    });
    test.todo('injectCleanMode should work correctly');
});
