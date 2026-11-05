import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { collectGostReferences } from './gosts.collector.js';
import type { GostRefs } from './gosts.types.ts';


let root: string;
let langDir: string;

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'gosts-collector-'));
    langDir = path.join(root, 'ru');
    fs.mkdirSync(langDir, { recursive: true });
});

afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
});

function writeMd(relPath: string, body: string): void {
    const full = path.join(langDir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body, 'utf8');
}

const gostList = [
    { anchorId: 'gost-gost-11371-78', code: 'ГОСТ 11371-78' },
];

describe('gosts.collector.collectGostReferences — skip semantics (+2)', () => {
    it('00.4.2#28 (+2) should skip .hidden dirs (skipHidden)', () => {
        writeMd('.hidden/page.md', '---\ntitle: H\n---\n\nГОСТ 11371-78');
        const refs: GostRefs = collectGostReferences(langDir, gostList);
        expect(refs['gost-gost-11371-78']).toHaveLength(0);
    });

    it('00.4.2#29 (+2) should skip _underscore dirs (skipUnderscore)', () => {
        writeMd('_assets/page.md', '---\ntitle: A\n---\n\nГОСТ 11371-78');
        const refs: GostRefs = collectGostReferences(langDir, gostList);
        expect(refs['gost-gost-11371-78']).toHaveLength(0);
    });

    it('00.4.2#30 (+2) should skip generated gosts output dir (skipFullPaths)', () => {
        // per gosts.paths.yaml: ru → 'Дополнительнаяинформация/ГОСТы'
        writeMd('Дополнительнаяинформация/ГОСТы/index.md', '---\ntitle: D\n---\n\nГОСТ 11371-78');
        writeMd('page.md', '---\ntitle: Page\n---\n\nГОСТ 11371-78');
        const refs: GostRefs = collectGostReferences(langDir, gostList);
        // только page.md, output-dir исключён
        expect(refs['gost-gost-11371-78']).toHaveLength(1);
        expect(refs['gost-gost-11371-78'][0].href).toBe('page.md');
    });

    it('00.4.2#31 (+2) should walk nested dirs and aggregate by file', () => {
        writeMd('section/chapter/page.md', '---\ntitle: P\n---\n\nГОСТ 11371-78 ГОСТ 11371-78');
        writeMd('other.md', '---\ntitle: O\n---\n\nГОСТ 11371-78');
        const refs: GostRefs = collectGostReferences(langDir, gostList);
        expect(refs['gost-gost-11371-78']).toHaveLength(2);
        const total = refs['gost-gost-11371-78'].reduce((s, r) => s + r.occurrences, 0);
        expect(total).toBe(3);
    });
});

describe('gosts.collector.collectGostReferences (+2)', () => {
    it('00.5.4#17 should find code occurrences in plain text', () => {
        writeMd('page.md', '---\ntitle: Page\n---\n\nAccording to ГОСТ 11371-78, washers.');
        const refs = collectGostReferences(langDir, gostList);
        expect(refs['gost-gost-11371-78']).toHaveLength(1);
        expect(refs['gost-gost-11371-78'][0].occurrences).toBe(1);
    });

    it('00.5.4#18 (+3, +5) should ignore code inside fenced block (mask delegate)', () => {
        writeMd('page.md', '---\ntitle: Page\n---\n\n```\nГОСТ 11371-78\n```\n');
        const refs = collectGostReferences(langDir, gostList);
        expect(refs['gost-gost-11371-78']).toHaveLength(0);
    });

    it('00.5.4#19 should count anchor references in links', () => {
        writeMd(
            'page.md',
            '---\ntitle: Page\n---\n\nSee [link](../gosts/index.md#gost-gost-11371-78).',
        );
        const refs = collectGostReferences(langDir, gostList);
        expect(refs['gost-gost-11371-78'].length).toBeGreaterThanOrEqual(1);
    });
});