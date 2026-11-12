import { describe, expect, it } from '@jest/globals';
import { ganttFixScrollModule } from './ganttFixScroll.module.ts';

describe('ganttFixScroll.module', () => {
  it('00.7.2#79 should have correct metadata', () => {
    expect(ganttFixScrollModule.name).toBe('ganttFixScroll');
    expect(ganttFixScrollModule.phase).toBe('post');
    expect(ganttFixScrollModule.defaultOrder).toBe(50);
    const engine = ganttFixScrollModule.args.find(a => a.flag === '--engine');
    expect(engine?.default).toBe('mermaid');
  });

  it('00.7.2#80 should lazy-load ModuleImpl', async () => {
    const impl = await ganttFixScrollModule.load();
    expect(typeof impl.run).toBe('function');
  });

  it('00.7.2#81 should not throw for non-existent buildDir (no HTML to patch)', async () => {
    const impl = await ganttFixScrollModule.load();
    await impl.run({ buildDir: '/tmp/__no_such_build__', engine: 'mermaid' });
  });
});