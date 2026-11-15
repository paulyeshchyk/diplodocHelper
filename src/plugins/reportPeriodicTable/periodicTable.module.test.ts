import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../cli/module-helpers.ts', () => ({
    resolveBuildDir: jest.fn(() => '/mock/build'),
}));

jest.mock('./report.ts', () => ({
    generateBytesCounterPage: jest.fn(),
}));

import { resolveBuildDir } from '../cli/module-helpers.ts';
import { generateBytesCounterPage } from './report.ts';
import { periodicTableModule } from './periodicTable.module.ts';

const mockResolveBuildDir = resolveBuildDir as jest.Mock;
const mockGenerate = generateBytesCounterPage as jest.Mock;

describe('periodicTableModule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolveBuildDir.mockReturnValue('/mock/build');
    });

    it('has correct metadata', () => {
        expect(periodicTableModule.name).toBe('periodicTable');
        expect(periodicTableModule.phase).toBe('post');
        expect(periodicTableModule.defaultOrder).toBe(55);
        expect(periodicTableModule.args).toEqual([]);
    });

    it('load() returns a handler with run()', async () => {
        const handler = await periodicTableModule.load();
        expect(typeof handler.run).toBe('function');
    });

    it('run() calls generateBytesCounterPage with buildDir and ru/en langs', async () => {
        const handler = await periodicTableModule.load();
        await handler.run({});

        expect(mockResolveBuildDir).toHaveBeenCalledTimes(1);
        expect(mockGenerate).toHaveBeenCalledTimes(1);
        expect(mockGenerate).toHaveBeenCalledWith({
            mapDir: '/mock/build',
            outputDir: '/mock/build',
            lang: ['ru', 'en'],
        });
    });

    it('run() propagates errors from generateBytesCounterPage', async () => {
        mockGenerate.mockImplementationOnce(() => {
            throw new Error('boom');
        });
        const handler = await periodicTableModule.load();
        await expect(handler.run({})).rejects.toThrow('boom');
    });
});