import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../cli/module-helpers.ts', () => ({
    resolveBuildDir: jest.fn(() => '/mock/build'),
}));

jest.mock('./report.ts', () => ({
    generateHelpTagPage: jest.fn(),
}));

import { resolveBuildDir } from '../cli/module-helpers.ts';
import { generateHelpTagPage } from './report.ts';
import { periodicTableHelpTagModule } from './periodicTableHelpTag.module.ts';

const mockResolveBuildDir = resolveBuildDir as jest.Mock;
const mockGenerate = generateHelpTagPage as jest.Mock;

describe('periodicTableHelpTagModule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolveBuildDir.mockReturnValue('/mock/build');
    });

    it('has correct metadata', () => {
        expect(periodicTableHelpTagModule.name).toBe('periodicTableHelpTag');
        expect(periodicTableHelpTagModule.phase).toBe('post');
        expect(periodicTableHelpTagModule.defaultOrder).toBe(60);
        expect(periodicTableHelpTagModule.args).toEqual([]);
    });

    it('load() returns a handler with run()', async () => {
        const handler = await periodicTableHelpTagModule.load();
        expect(typeof handler.run).toBe('function');
    });

    it('run() calls generateHelpTagPage with buildDir and ru/en langs', async () => {
        const handler = await periodicTableHelpTagModule.load();
        await handler.run({});

        expect(mockResolveBuildDir).toHaveBeenCalledTimes(1);
        expect(mockGenerate).toHaveBeenCalledTimes(1);
        expect(mockGenerate).toHaveBeenCalledWith({
            mapDir: '/mock/build',
            outputDir: '/mock/build',
            lang: ['ru', 'en'],
        });
    });

    it('run() propagates errors from generateHelpTagPage', async () => {
        mockGenerate.mockImplementationOnce(() => {
            throw new Error('boom');
        });
        const handler = await periodicTableHelpTagModule.load();
        await expect(handler.run({})).rejects.toThrow('boom');
    });
});