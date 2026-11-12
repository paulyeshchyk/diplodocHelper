import { describe, expect, it } from '@jest/globals';
import * as fs from 'node:fs';
import * as os from 'node:os';
import path from 'node:path';
import { inspectProject } from './init-config.inspector.ts';
import {
  scaffoldDimensions,
  scaffoldFeatureMapConfig,
  scaffoldFields,
  scaffoldLayout,
} from './init-config.scaffolders/index.ts';
import { ONLY_SHORTCUTS } from './init-config.ts';
import type { Inspection } from './init-config.types.ts';

function mkInspection(overrides: Partial<Inspection> = {}): Inspection {
  return {
    projectRoot: '/tmp/proj',
    docsDir: '/tmp/proj/docs',
    lang: 'ru',
    modulesFolder: 'Модули',
    modulePrefix: 'Модуль',
    existing: {
      layout: false,
      fields: false,
      featureMapConfig: false,
      dimensions: false,
      langYaml: false,
    },
    heuristics: {
      hasArmInPath: false,
      hasRazdelInPath: false,
      hasGosts: false,
      hasKnownIssues: false,
      hasFootnoteList: false,
    },
    warnings: [],
    ...overrides,
  };
}

describe('scaffoldLayout', () => {
  it('00.7.4#01 should use Модули defaults for flat project', () => {
    const json = scaffoldLayout(mkInspection({ modulesFolder: 'Модули', modulePrefix: 'Модуль' }));
    const cfg = JSON.parse(json);
    expect(cfg.modulesFolder).toBe('Модули');
    expect(cfg.modulePrefix).toBe('Модуль');
    expect(cfg.moduleSectionTypes).toBeNull();
    expect(cfg.strictDimensions).toBe(true);
    expect(cfg.includeEmpty).toBe(false);
  });

  it('00.7.4#02 should use hierarchical defaults for walk-all project', () => {
    const json = scaffoldLayout(mkInspection({ modulesFolder: null, modulePrefix: null }));
    const cfg = JSON.parse(json);
    expect(cfg.modulesFolder).toBeNull();
    expect(cfg.moduleSectionTypes).toEqual(['Chapter', 'Page']);
    expect(cfg.strictDimensions).toBe(false);
    expect(cfg.includeEmpty).toBe(true);
    expect(cfg.emptyLabel).toHaveProperty('content_type');
  });

  it('00.7.4#03 should include standard skipDirs', () => {
    const json = scaffoldLayout(mkInspection());
    const cfg = JSON.parse(json);
    expect(cfg.skipDirs).toContain('figures');
    expect(cfg.skipDirs).toContain('helptags');
    expect(cfg.skipDirs).toContain('Дополнительнаяинформация');
  });
});

describe('scaffoldFields', () => {
  it('00.7.4#04 should include service fields with frontmatterKey', () => {
    const yaml = scaffoldFields(mkInspection());
    expect(yaml).toContain('ident:');
    expect(yaml).toContain('frontmatterKey: pureTitle');
    expect(yaml).toContain('designation:');
    expect(yaml).toContain('frontmatterKey: title');
  });

  it('00.7.4#05 should include standard dimensions', () => {
    const yaml = scaffoldFields(mkInspection());
    expect(yaml).toContain('content_type:');
    expect(yaml).toContain('module:');
    expect(yaml).toContain('status:');
  });

  it('00.7.4#06 should add path-based section when detected', () => {
    const yaml = scaffoldFields(mkInspection({
      heuristics: { ...mkInspection().heuristics, hasRazdelInPath: true },
    }));
    expect(yaml).toContain('section:');
    expect(yaml).toContain('source: path');
    expect(yaml).toMatch(/regex:.*Раздел/);
  });

  it('00.7.4#07 should add path-based audience when detected', () => {
    const yaml = scaffoldFields(mkInspection({
      heuristics: { ...mkInspection().heuristics, hasArmInPath: true },
    }));
    expect(yaml).toContain('audience:');
    expect(yaml).toContain('slug: "manager"');
    expect(yaml).toContain('slug: "technologist"');
  });
});

describe('scaffoldFeatureMapConfig', () => {
  it('00.7.4#08 should use section×content_type when hasRazdelInPath', () => {
    const json = scaffoldFeatureMapConfig(mkInspection({
      heuristics: { ...mkInspection().heuristics, hasRazdelInPath: true, hasArmInPath: true },
    }));
    const cfg = JSON.parse(json);
    expect(cfg.rowDimension).toBe('section');
    expect(cfg.columnDimension).toBe('content_type');
    expect(cfg.stripDimensions).toContain('audience');
  });

  it('00.7.4#09 should fall back to audience row when no section', () => {
    const json = scaffoldFeatureMapConfig(mkInspection({
      heuristics: { ...mkInspection().heuristics, hasArmInPath: true },
    }));
    const cfg = JSON.parse(json);
    expect(cfg.rowDimension).toBe('audience');
  });

  it('00.7.4#10 should set chipLabelField to ident', () => {
    const json = scaffoldFeatureMapConfig(mkInspection());
    expect(JSON.parse(json).chipLabelField).toBe('ident');
  });
});

describe('scaffoldDimensions', () => {
  it('00.7.4#11 should include content_type with standard items', () => {
    const yaml = scaffoldDimensions(mkInspection());
    expect(yaml).toContain('content_type:');
    expect(yaml).toContain('screen:');
    expect(yaml).toContain('flow:');
  });

  it('00.7.4#12 should include status with standard items', () => {
    const yaml = scaffoldDimensions(mkInspection());
    expect(yaml).toContain('status:');
    expect(yaml).toContain('draft:');
    expect(yaml).toContain('done:');
  });
});

describe('inspectProject — docsDir resolution', () => {
  function mkRepo(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ic-inspect-'));
    return root;
  }

  it('00.7.4#13 should resolve <projectRoot>/docs when it exists', () => {
    const root = mkRepo();
    try {
      const docsDir = path.join(root, 'docs');
      fs.mkdirSync(path.join(docsDir, 'ru'), { recursive: true });
      fs.mkdirSync(path.join(docsDir, '_registry'), { recursive: true });

      const r = inspectProject(root, 'ru');
      expect(r.docsDir).toBe(docsDir);
      expect(r.projectRoot).toBe(root);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('00.7.4#14 should fall back to projectRoot when <projectRoot>/docs is absent', () => {
    const root = mkRepo();
    try {
      fs.mkdirSync(path.join(root, 'ru'), { recursive: true });
      fs.mkdirSync(path.join(root, '_registry'), { recursive: true });

      const r = inspectProject(root, 'ru');
      expect(r.docsDir).toBe(root);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('00.7.4#15 should throw when no docsDir can be found', () => {
    const root = mkRepo();
    try {
      // ничего не создаём — даже <root>/docs нет, <root> пуст
      expect(() => inspectProject(root, 'ru')).toThrow(/docsDir не найден/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('00.7.4#16 should prefer ru when both en and ru exist', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ic-lang-'));
    try {
      const docsDir = path.join(root, 'docs');
      fs.mkdirSync(path.join(docsDir, 'en'), { recursive: true });
      fs.mkdirSync(path.join(docsDir, 'ru'), { recursive: true });
      fs.mkdirSync(path.join(docsDir, '_registry'), { recursive: true });

      const r = inspectProject(root);
      expect(r.lang).toBe('ru');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('ONLY_SHORTCUTS', () => {
  it('00.7.4#17 should map plugins/pipeline to plugins.config.yaml', () => {
    expect(ONLY_SHORTCUTS.plugins).toBe('plugins.config.yaml');
    expect(ONLY_SHORTCUTS.pipeline).toBe('plugins.config.yaml');
  });

  it('00.7.4#18 should map layout/fields/featureMap/dimensions', () => {
    expect(ONLY_SHORTCUTS.layout).toBe('layout.json');
    expect(ONLY_SHORTCUTS.fields).toBe('fields.yaml');
    expect(ONLY_SHORTCUTS.featureMap).toBe('feature-map.config.json');
    expect(ONLY_SHORTCUTS.featuremap).toBe('feature-map.config.json');
    expect(ONLY_SHORTCUTS.dimensions).toBe('dimensions.yaml');
  });
});