import { describe, it, expect, vi } from 'vitest';
import { LayerViolationsRule } from '../src/rules/layer-violations';
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

describe('LayerViolationsRule', () => {
  const rule = new LayerViolationsRule();

  it('detects violations when layer dependency flow is incorrect', async () => {
    const context: ScanContext = {
      root: '/root',
      files: ['/root/src/ui/Component.tsx', '/root/src/data/Repo.ts'],
      modules: {},
      config: {
        rules: {
          'layer-violations': {
            severity: 'error',
            layers: [
              { name: 'ui', pattern: 'src/ui/**' },
              { name: 'data', pattern: 'src/data/**' },
            ],
            allowed: [
              { importer: 'data', imports: [] }, // data cannot import anything
              { importer: 'ui', imports: ['data'] }, // ui can import data
            ],
          },
        },
      },
    } as any;

    // Mock imports for both files
    vi.mocked(importUtils.extractImports).mockImplementation((path) => {
      if (path === '/root/src/ui/Component.tsx') {
        return [{ specifier: '../data/Repo', line: 1 }];
      }
      if (path === '/root/src/data/Repo.ts') {
        return [{ specifier: '../ui/Component', line: 5 }];
      }
      return [];
    });

    vi.mocked(importUtils.resolveImport).mockImplementation((specifier) => {
      if (specifier === '../data/Repo') return '/root/src/data/Repo.ts';
      if (specifier === '../ui/Component') return '/root/src/ui/Component.tsx';
      return undefined;
    });

    const results = await rule.run(context);

    // Should find 1 violation (Data -> UI)
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('Layer violation: "data" cannot import from "ui"');
    expect(results[0].file).toBe('/root/src/data/Repo.ts');
  });

  it('allows imports within the same layer', async () => {
    const context: ScanContext = {
      root: '/root',
      files: ['/root/src/ui/A.tsx', '/root/src/ui/B.tsx'],
      modules: {},
      config: {
        rules: {
          'layer-violations': {
            severity: 'error',
            layers: [{ name: 'ui', pattern: 'src/ui/**' }],
            allowed: [{ importer: 'ui', imports: [] }],
          },
        },
      },
    } as any;

    vi.mocked(importUtils.extractImports).mockReturnValue([{ specifier: './B', line: 1 }]);
    vi.mocked(importUtils.resolveImport).mockReturnValue('/root/src/ui/B.tsx');

    const results = await rule.run(context);
    expect(results).toHaveLength(0);
  });
});
