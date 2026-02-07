import { describe, it, expect, vi } from 'vitest';
import { PublicApiOnlyRule } from '../src/rules/public-api-only';
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

describe('PublicApiOnlyRule', () => {
  const rule = new PublicApiOnlyRule();

  it('detects deep imports into protected modules', async () => {
    const context: ScanContext = {
      root: '/root',
      files: ['/root/src/app.ts', '/root/src/features/auth/internal/secret.ts'],
      allFiles: ['/root/src/app.ts', '/root/src/features/auth/internal/secret.ts'],
      dirtyFiles: [],
      modules: {},
      config: {
        rules: {
          'public-api-only': {
            severity: 'error',
            modules: ['src/features/*'],
          },
        },
      },
    } as any;

    // Mock for both files in context
    vi.mocked(importUtils.extractImports).mockImplementation((path) => {
      if (path === '/root/src/app.ts') {
        return [{ specifier: './features/auth/internal/secret', line: 1 }];
      }
      return [];
    });
    vi.mocked(importUtils.resolveImport).mockReturnValueOnce('/root/src/features/auth/internal/secret.ts');

    const results = await rule.run(context);

    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('Deep import detected: use the public API');
    expect(results[0].file).toBe('/root/src/app.ts');
  });

  it('allows imports through index files', async () => {
    const context: ScanContext = {
      root: '/root',
      files: ['/root/src/app.ts', '/root/src/features/auth/index.ts'],
      allFiles: ['/root/src/app.ts', '/root/src/features/auth/index.ts'],
      dirtyFiles: [],
      modules: {},
      config: {
        rules: {
          'public-api-only': {
            severity: 'error',
            modules: ['src/features/*'],
          },
        },
      },
    } as any;

    vi.mocked(importUtils.extractImports).mockReturnValueOnce([
      { specifier: './features/auth', line: 1 },
    ]);
    vi.mocked(importUtils.resolveImport).mockReturnValueOnce('/root/src/features/auth/index.ts');

    const results = await rule.run(context);
    expect(results).toHaveLength(0);
  });

  it('allows internal imports within the same module', async () => {
    const context: ScanContext = {
      root: '/root',
      files: [
        '/root/src/features/auth/ui/LoginForm.tsx',
        '/root/src/features/auth/internal/crypto.ts'
      ],
      allFiles: [
        '/root/src/features/auth/ui/LoginForm.tsx',
        '/root/src/features/auth/internal/crypto.ts'
      ],
      dirtyFiles: [],
      modules: {},
      config: {
        rules: {
          'public-api-only': {
            severity: 'error',
            modules: ['src/features/*'],
          },
        },
      },
    } as any;

    vi.mocked(importUtils.extractImports).mockReturnValueOnce([
      { specifier: '../internal/crypto', line: 1 },
    ]);
    vi.mocked(importUtils.resolveImport).mockReturnValueOnce('/root/src/features/auth/internal/crypto.ts');

    const results = await rule.run(context);
    expect(results).toHaveLength(0);
  });
});
