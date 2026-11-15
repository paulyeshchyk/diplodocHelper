import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../cli/module-helpers.ts', () => ({
    resolveBuildDir: jest.fn(() => '/mock/build'),
    resolveDocsDir: jest.fn(() => '/mock/docs'),
}));

jest.mock('./report.ts', () => ({
    generateStat: jest.fn(),
}));

import { resolveBuildDir, resolveDocsDir } from '../cli/module-helpers.ts';
import { generateStat } from './report.ts';
import { periodicStatModule } from './periodicStat.module.ts';

const mockResolveBuildDir = resolveBuildDir as jest.Mock;
const mockResolveDocsDir = resolveDocsDir as jest.Mock;
const mockGenerate = generateStat as jest.Mock;

describe('periodicStatModule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolveBuildDir.mockReturnValue('/mock/build');
        mockResolveDocsDir.mockReturnValue('/mock/docs');
    });

    it('has correct metadata', () => {
        expect(periodicStatModule.name).toBe('periodicStat');
        expect(periodicStatModule.phase).toBe('pre');
        expect(periodicStatModule.defaultOrder).toBe(63);
        expect(periodicStatModule.args).toEqual([]);
    });

    it('load() returns a handler with run()', async () => {
        const handler = await periodicStatModule.load();
        expect(typeof handler.run).toBe('function');
    });

    it('run() calls generateStat with buildDir and docsDir', async () => {
        const handler = await periodicStatModule.load();
        await handler.run({});

        expect(mockResolveBuildDir).toHaveBeenCalledTimes(1);
        expect(mockResolveDocsDir).toHaveBeenCalledTimes(1);
        expect(mockGenerate).toHaveBeenCalledTimes(1);
        expect(mockGenerate).toHaveBeenCalledWith({
            outputDir: '/mock/build',
            docsDir: '/mock/docs',
            langs: ['ru', 'en'],
        });
    });
});