import { describe, it, expect, vi } from 'vitest';
import { detectCycles, resolveImport, buildImportGraph } from '../src/rules/circular-dependencies';
import * as fs from 'fs';
import path from 'path';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
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

    expect(resolveImport('./a.ts', fileMain, knownFiles)).toBe(fileA);
  });

  it('resolves with implicit extension', () => {
    const fileA = getPath('/root/src/a.ts');
    const fileMain = getPath('/root/src/main.ts');
    const knownFiles = new Set([fileA]);

    expect(resolveImport('./a', fileMain, knownFiles)).toBe(fileA);
  });

  it('resolves a directory with index.ts', () => {
    const fileIndex = getPath('/root/src/index.ts');
    const fileMain = getPath('/root/src/main.ts');
    const knownFiles = new Set([fileIndex]);

    expect(resolveImport('.', fileMain, knownFiles)).toBe(fileIndex);
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

    const graph = buildImportGraph([fileA, fileB], getPath('/root'));

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

    const graph = buildImportGraph([fileA, fileB], getPath('/root'));

    expect(graph.get(fileA)?.has(fileB)).toBe(true);
  });
});
