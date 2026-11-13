// src/nls.test.ts

import { describe, expect, it } from '@jest/globals';
import { nls_ts } from './nls_ts.js';
import enJson from '../package.nls.json';
import ruJson from '../package.nls.ru.json';

/** Собирает все строковые листья объекта в виде ['путь.до.ключа', 'значение']. */
function collectLeaves(obj: unknown, prefix = ''): Array<[string, string]> {
    if (typeof obj === 'string') return [[prefix, obj]];
    if (obj && typeof obj === 'object') {
        return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
            collectLeaves(v, prefix ? `${prefix}.${k}` : k),
        );
    }
    return [];
}

/** Все ключи из nls_ts, которые мы добавили в этой волне. */
function yamlFormatKeys(): string[] {
    return collectLeaves(nls_ts)
        .map(([path]) => path)
        .filter(p => p.startsWith('plugin.yaml.format.') || p === 'command.md.format');
}

describe('nls — yaml.format', () => {
    it('00.8.6#01 nls_ts содержит ключи для plugin.yaml.format.*', () => {
        const keys = yamlFormatKeys().filter(k => k.startsWith('plugin.yaml.format.'));
        expect(keys.length).toBeGreaterThanOrEqual(9); // 4 basic + 5 error
    });

    it('00.8.6#02 каждый ключ из nls_ts присутствует в en и ru', () => {
        const keys = yamlFormatKeys();
        for (const key of keys) {
            expect(key in enJson).toBe(true);
            expect(key in ruJson).toBe(true);
        }
    });

    it('00.8.6#03 нет пустых значений ни в en, ни в ru', () => {
        for (const key of yamlFormatKeys()) {
            const en = (enJson as Record<string, string>)[key];
            const ru = (ruJson as Record<string, string>)[key];
            expect(typeof en).toBe('string');
            expect(typeof ru).toBe('string');
            expect(en.trim().length).toBeGreaterThan(0);
            expect(ru.trim().length).toBeGreaterThan(0);
        }
    });

    it('00.8.6#04 набор ключей en и ru совпадает для yaml.format', () => {
        const yamlKeys = yamlFormatKeys();
        const enYaml = Object.keys(enJson).filter(k => yamlKeys.includes(k));
        const ruYaml = Object.keys(ruJson).filter(k => yamlKeys.includes(k));
        expect(new Set(enYaml)).toEqual(new Set(ruYaml));
    });

    it('00.8.6#05 плейсхолдеры {0} согласованы между en и ru', () => {
        // activeHint / inactiveHint / cannotFormat содержат {0}
        const withPlaceholder = [
            'plugin.yaml.format.activeHint',
            'plugin.yaml.format.inactiveHint',
            'plugin.yaml.format.error.cannotFormat',
        ];
        for (const key of withPlaceholder) {
            const en = (enJson as Record<string, string>)[key];
            const ru = (ruJson as Record<string, string>)[key];
            expect(en).toContain('{0}');
            expect(ru).toContain('{0}');
        }
    });
});