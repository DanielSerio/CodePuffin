import { describe, it, expect, vi } from 'vitest';
import { ModuleBoundariesRule } from '../src/rules/module-boundaries';
import { ScanContext } from '../src/core/scanner';
import * as importUtils from '../src/utils/imports';

vi.mock('../src/utils/imports', async () => {
  const actual = await vi.importActual('../src/utils/imports') as any;
  return {
    ...actual,
    extractImports: vi.fn(),
    resolveImport: vi.fn(),
  };
});

describe('ModuleBoundariesRule', () => {
  const rule = new ModuleBoundariesRule();

  it('detects violations when modules import from forbidden modules', async () => {
    const context: ScanContext = {
      root: '/root',
      files: ['/root/src/features/A/service.ts', '/root/src/features/B/service.ts'],
      modules: {},
      config: {
        rules: {
          'module-boundaries': {
            severity: 'error',
            modules: {
              '@featureA': 'src/features/A/*',
              '@featureB': 'src/features/B/*',
            },
            rules: [
              { importer: '@featureA', imports: '@featureB', allow: false, message: 'A cannot import B' }
            ],
          },
        },
      },
    } as any;

    // Feature A imports Feature B
    vi.mocked(importUtils.extractImports).mockImplementation((path) => {
      if (path === '/root/src/features/A/service.ts') {
        return [{ specifier: '../B/service', line: 1 }];
      }
      return [];
    });

    vi.mocked(importUtils.resolveImport).mockImplementation((specifier) => {
      if (specifier === '../B/service') return '/root/src/features/B/service.ts';
      return undefined;
    });

    const results = await rule.run(context);

    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('A cannot import B');
    expect(results[0].file).toBe('/root/src/features/A/service.ts');
  });

  it('allows imports when rule sets allow: true', async () => {
    const context: ScanContext = {
      root: '/root',
      files: ['/root/src/features/A/service.ts', '/root/src/shared/util.ts'],
      modules: {},
      config: {
        rules: {
          'module-boundaries': {
            severity: 'error',
            modules: {
              '@featureA': 'src/features/A/*',
              '@shared': 'src/shared/*',
            },
            rules: [
              { importer: '@featureA', imports: '@shared', allow: true }
            ],
          },
        },
      },
    } as any;

    vi.mocked(importUtils.extractImports).mockImplementation((path) => {
      if (path === '/root/src/features/A/service.ts') {
        return [{ specifier: '../../shared/util', line: 1 }];
      }
      return [];
    });

    vi.mocked(importUtils.resolveImport).mockImplementation((specifier) => {
      if (specifier === '../../shared/util') return '/root/src/shared/util.ts';
      return undefined;
    });

    const results = await rule.run(context);
    expect(results).toHaveLength(0);
  });
});
