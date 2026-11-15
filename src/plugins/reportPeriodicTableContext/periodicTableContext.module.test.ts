import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../cli/module-helpers.ts', () => ({
    resolveBuildDir: jest.fn(() => '/mock/build'),
}));

jest.mock('./report.ts', () => ({
    generateContextsPage: jest.fn(),
}));

import { resolveBuildDir } from '../cli/module-helpers.ts';
import { generateContextsPage } from './report.ts';
import { periodicTableContextModule } from './periodicTableContext.module.ts';

const mockResolveBuildDir = resolveBuildDir as jest.Mock;
const mockGenerate = generateContextsPage as jest.Mock;

describe('periodicTableContextModule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolveBuildDir.mockReturnValue('/mock/build');
    });

    it('has correct metadata', () => {
        expect(periodicTableContextModule.name).toBe('periodicTableContext');
        expect(periodicTableContextModule.phase).toBe('post');
        expect(periodicTableContextModule.defaultOrder).toBe(65);
        expect(periodicTableContextModule.args).toEqual([]);
    });

    it('load() returns a handler with run()', async () => {
        const handler = await periodicTableContextModule.load();
        expect(typeof handler.run).toBe('function');
    });

    it('run() calls generateContextsPage with buildDir and ru/en langs', async () => {
        const handler = await periodicTableContextModule.load();
        await handler.run({});

        expect(mockResolveBuildDir).toHaveBeenCalledTimes(1);
        expect(mockGenerate).toHaveBeenCalledTimes(1);
        expect(mockGenerate).toHaveBeenCalledWith({
            mapDir: '/mock/build',
            outputDir: '/mock/build',
            lang: ['ru', 'en'],
        });
    });

    it('run() propagates errors from generateContextsPage', async () => {
        mockGenerate.mockImplementationOnce(() => {
            throw new Error('boom');
        });
        const handler = await periodicTableContextModule.load();
        await expect(handler.run({})).rejects.toThrow('boom');
    });
});