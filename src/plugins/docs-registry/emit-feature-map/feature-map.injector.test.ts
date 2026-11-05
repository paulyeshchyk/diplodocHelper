import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runGeneration } from './feature-map.injector.js';

/**
 * Тестовые константы — вынесены, чтобы FM-a..d не трогали тела тестов.
 */
const FM = {
    markers: {
        style: 'dl-feature-map-style',
        client: 'dl-feature-map-client',
    } as const,
};

let root: string;

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-injector-'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    jest.restoreAllMocks();
});

function writePage(relPath: string, body: string): string {
    const full = path.join(root, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body, 'utf8');
    return full;
}

const WITH_MARKER = `<html><head></head><body><div data-feature-map>x</div></body></html>`;
const WITHOUT_MARKER = `<html><head></head><body><p>plain</p></body></html>`;

describe('feature-map.injector.runGeneration', () => {
    it('57.2#01 should inject style and client into html with data-feature-map', () => {
        const htmlPath = writePage('page.html', WITH_MARKER);
        const r = runGeneration(root);

        expect(r.success).toEqual([htmlPath]);
        expect(r.failed).toEqual([]);

        const html = fs.readFileSync(htmlPath, 'utf8');
        expect(html).toContain(`id="${FM.markers.style}"`);
        expect(html).toContain(`id="${FM.markers.client}"`);
        expect(html).toContain('<style');
        expect(html).toContain('<script');
    });

    it('57.2#02 should skip html without marker and not touch file', () => {
        const htmlPath = writePage('plain.html', WITHOUT_MARKER);
        const before = fs.readFileSync(htmlPath, 'utf8');
        const r = runGeneration(root);

        expect(r.success).toEqual([]);
        expect(r.failed).toEqual([]);

        const after = fs.readFileSync(htmlPath, 'utf8');
        expect(after).toBe(before);
        expect(after).not.toContain(`id="${FM.markers.style}"`);
    });

    it('57.2#03 should be idempotent (no double injection on re-run)', () => {
        const htmlPath = writePage('page.html', WITH_MARKER);
        runGeneration(root);
        runGeneration(root); // повторный прогон

        const html = fs.readFileSync(htmlPath, 'utf8');
        const styleCount = (html.match(new RegExp(`id="${FM.markers.style}"`, 'g')) || []).length;
        const clientCount = (html.match(new RegExp(`id="${FM.markers.client}"`, 'g')) || []).length;
        expect(styleCount).toBe(1);
        expect(clientCount).toBe(1);
    });
});