import { describe, it, expect, vi } from 'vitest';
import { detectCycles, buildImportGraph } from '../src/rules/circular-dependencies';
import { resolveImport } from '../src/utils/imports';
import * as fs from 'fs';
import path from 'path';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  statSync: vi.fn(() => ({ size: 100 })),
}));

// Helper to get platform-specific absolute path normalized to forward slashes
const getPath = (p: string) => path.resolve(p).replace(/\\/g, '/');

describe('detectCycles', () => {
  it('detects a simple 2-node cycle', () => {
    const graph = new Map<string, Set<string>>([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['a.ts'])],
    ]);

    const cycles = detectCycles(graph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(['a.ts', 'b.ts']);
  });
});

describe('resolveImport', () => {
  it('resolves an exact match', () => {
    const fileA = getPath('/root/src/a.ts');
    const fileMain = getPath('/root/src/main.ts');
    const knownFiles = new Set([fileA]);

    expect(resolveImport('./a.ts', fileMain, knownFiles, getPath('/root'))).toBe(fileA);
  });

  it('resolves with implicit extension', () => {
    const fileA = getPath('/root/src/a.ts');
    const fileMain = getPath('/root/src/main.ts');
    const knownFiles = new Set([fileA]);

    expect(resolveImport('./a', fileMain, knownFiles, getPath('/root'))).toBe(fileA);
  });

  it('resolves a directory with index.ts', () => {
    const fileIndex = getPath('/root/src/index.ts');
    const fileMain = getPath('/root/src/main.ts');
    const knownFiles = new Set([fileIndex]);

    expect(resolveImport('.', fileMain, knownFiles, getPath('/root'))).toBe(fileIndex);
  });
});

describe('buildImportGraph', () => {
  it('detects static imports', () => {
    const fileA = getPath('/root/a.ts');
    const fileB = getPath('/root/b.ts');

    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (p === fileA || p === path.resolve(fileA)) return "import './b'";
      if (p === fileB || p === path.resolve(fileB)) return "export const b = 1";
      return "";
    });

    const mockContext = {
      root: getPath('/root'),
      files: [fileA, fileB],
      config: { project: { aliases: {} } }
    } as any;

    const graph = buildImportGraph([fileA, fileB], mockContext);

    expect(graph.get(fileA)?.has(fileB)).toBe(true);
  });

  it('detects dynamic imports', () => {
    const fileA = getPath('/root/a.ts');
    const fileB = getPath('/root/b.ts');

    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (p === fileA || p === path.resolve(fileA)) return "import('./b')";
      if (p === fileB || p === path.resolve(fileB)) return "export const b = 1";
      return "";
    });

    const mockContext = {
      root: getPath('/root'),
      files: [fileA, fileB],
      config: { project: { aliases: {} } }
    } as any;

    const graph = buildImportGraph([fileA, fileB], mockContext);

    expect(graph.get(fileA)?.has(fileB)).toBe(true);
  });
});

import { CircularDependenciesRule } from '../src/rules/circular-dependencies';
import { ScanContext } from '../src/core/scanner';

describe('CircularDependenciesRule', () => {
  const rule = new CircularDependenciesRule();

  it('respects ignorePaths', async () => {
    const fileA = getPath('/root/src/a.ts');
    const fileB = getPath('/root/src/b.ts');

    const context: ScanContext = {
      root: getPath('/root'),
      files: [fileA, fileB],
      config: {
        rules: {
          'circular-dependencies': {
            severity: 'error',
            ignorePaths: ['src/b.ts']
          }
        }
      }
    } as any;

    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (p === fileA || p === path.resolve(fileA)) return "import './b'";
      if (p === fileB || p === path.resolve(fileB)) return "import './a'";
      return "";
    });

    const results = await rule.run(context);
    // Since B is ignored, only edges from A to unknown B (not in set) remain, 
    // but detectCycles only iterates over context.files keys in graph.
    // If B is filtered out, it won't be in the graph.
    expect(results).toHaveLength(0);
  });

  it('respects maxDepth', async () => {
    const fileA = getPath('/root/a.ts');
    const fileB = getPath('/root/b.ts');
    const fileC = getPath('/root/c.ts');

    const context: ScanContext = {
      root: getPath('/root'),
      files: [fileA, fileB, fileC],
      config: {
        rules: {
          'circular-dependencies': {
            severity: 'error',
            maxDepth: 2 // Only cycles of length 2 or less
          }
        }
      }
    } as any;

    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (p === fileA || p === path.resolve(fileA)) return "import './b'";
      if (p === fileB || p === path.resolve(fileB)) return "import './c'";
      if (p === fileC || p === path.resolve(fileC)) return "import './a'";
      return "";
    });

    const results = await rule.run(context);
    // Cycle A -> B -> C -> A is length 3, should be ignored
    expect(results).toHaveLength(0);
  });
});

