import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../cli/module-helpers.ts', () => ({
    resolveBuildDir: jest.fn(() => '/mock/build'),
    resolveLangDir: jest.fn(() => '/mock/docs/ru'),
    findSectionIndexHtml: jest.fn(),
}));

jest.mock('./inject.ts', () => ({
    injectFootnoteList: jest.fn(() => ({ success: true, count: 0 })),
}));

import * as path from 'node:path';
import { findSectionIndexHtml, resolveBuildDir, resolveLangDir } from '../cli/module-helpers.ts';
import { injectFootnoteList } from './inject.ts';
import { footnoteListModule } from './footnoteList.module.ts';

const mockResolveBuildDir = resolveBuildDir as jest.Mock;
const mockResolveLangDir = resolveLangDir as jest.Mock;
const mockFindSection = findSectionIndexHtml as jest.Mock;
const mockInject = injectFootnoteList as jest.Mock;

describe('footnoteListModule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockResolveBuildDir.mockReturnValue('/mock/build');
        mockResolveLangDir.mockReturnValue('/mock/docs/ru');
        mockInject.mockReturnValue({ success: true, count: 0 });
    });

    it('has correct metadata', () => {
        expect(footnoteListModule.name).toBe('footnoteList');
        expect(footnoteListModule.phase).toBe('post');
        expect(footnoteListModule.defaultOrder).toBe(26);
        expect(footnoteListModule.args.length).toBe(2);
    });

    it('load() returns a handler with run()', async () => {
        const handler = await footnoteListModule.load();
        expect(typeof handler.run).toBe('function');
    });

    it('run() with --targetHtml resolves path and calls inject', async () => {
        const handler = await footnoteListModule.load();
        await handler.run({ targetHtml: './build/ru/Переченьсносок/index.html' });

        expect(mockFindSection).not.toHaveBeenCalled();
        expect(mockResolveLangDir).toHaveBeenCalledWith(expect.any(Object), 'ru');
        expect(mockResolveBuildDir).toHaveBeenCalledTimes(1);
        expect(mockInject).toHaveBeenCalledTimes(1);


        const call = mockInject.mock.calls[0][0] as {
            targetHtml: string;
            docsDir: string;
            langPrefix: string | null;
        };

        expect(path.isAbsolute(call.targetHtml)).toBe(true);
        expect(call.docsDir).toBe('/mock/docs/ru');
        expect(call.langPrefix).toBe('ru');
    });

    it('run() with --section uses findSectionIndexHtml', async () => {
        mockFindSection.mockReturnValue('/mock/build/ru/section/index.html');
        const handler = await footnoteListModule.load();
        await handler.run({ section: 'МояСекция' });

        expect(mockFindSection).toHaveBeenCalledWith('/mock/build', 'МояСекция');
        expect(mockInject).toHaveBeenCalledTimes(1);
    });

    it('run() with --section throws if findSectionIndexHtml returns null', async () => {
        mockFindSection.mockReturnValue(null);
        const handler = await footnoteListModule.load();
        await expect(handler.run({ section: 'Нету' })).rejects.toThrow(/не найдена/);
        expect(mockInject).not.toHaveBeenCalled();
    });

    it('run() without --section and without --targetHtml throws', async () => {
        const handler = await footnoteListModule.load();
        await expect(handler.run({})).rejects.toThrow(/нужен --section или --targetHtml/);
        expect(mockInject).not.toHaveBeenCalled();
    });

    it('run() throws if injectFootnoteList returns success=false', async () => {
        mockInject.mockReturnValue({ success: false });
        const handler = await footnoteListModule.load();
        await expect(handler.run({ targetHtml: './x/index.html' })).rejects.toThrow(/success=false/);
    });
});