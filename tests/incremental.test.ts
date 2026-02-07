import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scanner } from '../src/core/scanner';
import { Config } from '../src/core/config';
import { RuleResult } from '../src/core/rules';
import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';

vi.mock('fast-glob');
vi.mock('fs');

describe('Incremental Scanning - Phase 1: Hashing & Persistence', () => {
  const root = path.resolve('/project').replace(/\\/g, '/');
  const cachePath = path.join(root, '.puffin-cache.json');
  const config: Config = {
    project: { include: ['src/**/*'], exclude: [], aliases: {} },
    rules: {},
    output: { format: 'stylish' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects which files have changed based on content hashing', async () => {
    const file1 = path.join(root, 'src/a.ts').replace(/\\/g, '/');
    const file2 = path.join(root, 'src/b.ts').replace(/\\/g, '/');

    const cacheStorage = new Map<string, string>();

    // Mock FS
    vi.mocked(fs.existsSync).mockImplementation((p) => cacheStorage.has(p as string));
    vi.mocked(fs.writeFileSync).mockImplementation((p, data) => {
      cacheStorage.set(p as string, data as string);
    });
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const s = p as string;
      if (s === cachePath) return cacheStorage.get(s) || '';
      if (s.includes('a.ts')) return s.includes('modified') ? 'content-a-mod' : 'content-a';
      if (s.includes('b.ts')) return 'content-b';
      return '';
    });
    vi.mocked(fs.statSync).mockImplementation((p) => {
      const s = p as string;
      if (s.includes('a.ts')) return { mtimeMs: s.includes('modified') ? 2000 : 1000 } as any;
      return { mtimeMs: 1000 } as any;
    });
    vi.mocked(fg).mockResolvedValue([file1, file2]);

    // 1. First Scan
    const scanner1 = new Scanner(root, config);
    const context1 = await scanner1.createContext();

    expect(context1.dirtyFiles).toContain(file1);
    expect(context1.dirtyFiles).toContain(file2);

    // 2. Mock a change in file A for the next scanner
    // We update the mock's behavior for the next run
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const s = p as string;
      if (s === cachePath) return cacheStorage.get(s) || '';
      if (s === file1) return 'content-a-modified'; // Changed
      if (s === file2) return 'content-b'; // Same
      return '';
    });
    vi.mocked(fs.statSync).mockImplementation((p) => {
      const s = p as string;
      if (s === file1) return { mtimeMs: 2000 } as any; // Changed
      if (s === file2) return { mtimeMs: 1000 } as any; // Same
      return { mtimeMs: 0 } as any;
    });

    // 3. Second scan
    const scanner2 = new Scanner(root, config);
    const context2 = await scanner2.createContext();

    expect(context2.dirtyFiles).toContain(file1);
    expect(context2.dirtyFiles).not.toContain(file2);
  });

  describe('Phase 2: Blast Radius (The Dependency Ripple)', () => {
    it('marks dependents of dirty files as dirty', async () => {
      const parent = path.resolve('/project/src/parent.ts').replace(/\\/g, '/');
      const child = path.resolve('/project/src/child.ts').replace(/\\/g, '/');

      const cacheStorage = new Map<string, string>();
      vi.mocked(fs.existsSync).mockImplementation((p) => cacheStorage.has(p as string));
      vi.mocked(fs.writeFileSync).mockImplementation((p, data) => cacheStorage.set(p as string, data as string));

      // We need to mock dependency resolution
      // Let's assume child imports parent
      vi.mocked(fg).mockResolvedValue([parent, child]);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const s = p as string;
        if (s === cachePath) return cacheStorage.get(s) || '';
        if (s === child) return "import { something } from './parent'";
        return "export const something = 1";
      });
      vi.mocked(fs.statSync).mockImplementation(() => ({ mtimeMs: 1000 } as any));

      // 1. Initial Scan (builds the graph)
      const scanner1 = new Scanner(root, config);
      await scanner1.createContext();

      // 2. Mock a change in 'parent.ts'
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const s = p as string;
        if (s === cachePath) return cacheStorage.get(s) || '';
        if (s === parent) return "export const something = 2"; // Content change
        if (s === child) return "import { something } from './parent'"; // Unchanged
        return "";
      });
      vi.mocked(fs.statSync).mockImplementation((p) => {
        const s = p as string;
        if (s === parent) return { mtimeMs: 2000 } as any; // mtime change
        return { mtimeMs: 1000 } as any;
      });

      // 3. Second Scan (Incremental)
      const scanner2 = new Scanner(root, config);
      const context2 = await scanner2.createContext();

      // Parent is dirty because it changed
      expect(context2.dirtyFiles).toContain(parent);

      // Child MUST be dirty because parent changed, even if child's hash is the same
      // This will FAIL initially as Blast Radius is not implemented
      expect(context2.dirtyFiles).toContain(child);
    });
  });

  describe('Phase 3: Result Merging (The Partial Success)', () => {
    it('merges fresh results for dirty files with cached results for clean files', async () => {
      const fileA = path.join(root, 'src/a.ts').replace(/\\/g, '/');
      const fileB = path.join(root, 'src/b.ts').replace(/\\/g, '/');

      const cacheStorage = new Map<string, string>();

      vi.mocked(fs.existsSync).mockImplementation((p) => cacheStorage.has(p as string));
      vi.mocked(fs.writeFileSync).mockImplementation((p, data) => {
        cacheStorage.set(p as string, data as string);
      });
      vi.mocked(fg).mockResolvedValue([fileA, fileB]);

      // --- SCAN 1: Both files produce errors ---
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const s = p as string;
        if (s === cachePath) return cacheStorage.get(s) || '';
        if (s === fileA) return 'error-code-a';
        if (s === fileB) return 'error-code-b';
        return '';
      });
      vi.mocked(fs.statSync).mockImplementation(() => ({ mtimeMs: 1000 } as any));

      // First scan: all files dirty
      const scanner1 = new Scanner(root, config);
      const context1 = await scanner1.createContext();
      const cache1 = scanner1.getCacheService();

      expect(context1.dirtyFiles).toContain(fileA);
      expect(context1.dirtyFiles).toContain(fileB);

      // Simulate rule results for both files (as if runner ran)
      const errorA: RuleResult = {
        ruleId: 'test-rule', file: fileA, message: 'Error in A', severity: 'error'
      };
      const errorB: RuleResult = {
        ruleId: 'test-rule', file: fileB, message: 'Error in B', severity: 'error'
      };
      cache1.setCachedResultsForFile(fileA, [errorA]);
      cache1.setCachedResultsForFile(fileB, [errorB]);
      cache1.saveCache();

      // --- SCAN 2: Fix file A, only A is dirty ---
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const s = p as string;
        if (s === cachePath) return cacheStorage.get(s) || '';
        if (s === fileA) return 'fixed-code-a'; // Changed content
        if (s === fileB) return 'error-code-b'; // Same
        return '';
      });
      vi.mocked(fs.statSync).mockImplementation((p) => {
        const s = p as string;
        if (s === fileA) return { mtimeMs: 2000 } as any; // Changed
        return { mtimeMs: 1000 } as any; // Same
      });

      const scanner2 = new Scanner(root, config);
      const context2 = await scanner2.createContext();
      const cache2 = scanner2.getCacheService();

      // Only A should be dirty
      expect(context2.dirtyFiles).toContain(fileA);
      expect(context2.dirtyFiles).not.toContain(fileB);

      // Simulate: runner re-analyzes dirty files, A now has no errors
      cache2.clearResultsForFiles(context2.dirtyFiles);
      // A produces no results now (fixed), so nothing stored for A

      // Merge: fresh (A: none) + cached (B: error)
      const cachedForClean = cache2.getCachedResultsForFile(fileB);
      expect(cachedForClean).toHaveLength(1);
      expect(cachedForClean[0].message).toBe('Error in B');

      // A's cached results should be cleared
      const cachedForDirty = cache2.getCachedResultsForFile(fileA);
      expect(cachedForDirty).toHaveLength(0);

      // Total merged results = only B's error
      const allResults = cache2.getAllCachedResults();
      expect(allResults).toHaveLength(1);
      expect(allResults[0].file).toBe(fileB);
    });

    it('returns cached results when no files are dirty', async () => {
      const fileA = path.join(root, 'src/a.ts').replace(/\\/g, '/');

      const cacheStorage = new Map<string, string>();

      vi.mocked(fs.existsSync).mockImplementation((p) => cacheStorage.has(p as string));
      vi.mocked(fs.writeFileSync).mockImplementation((p, data) => {
        cacheStorage.set(p as string, data as string);
      });
      vi.mocked(fg).mockResolvedValue([fileA]);

      // First scan
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const s = p as string;
        if (s === cachePath) return cacheStorage.get(s) || '';
        return 'content';
      });
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 1000 } as any);

      const scanner1 = new Scanner(root, config);
      const context1 = await scanner1.createContext();
      const cache1 = scanner1.getCacheService();

      // Store a result
      const result: RuleResult = {
        ruleId: 'test-rule', file: fileA, message: 'Cached issue', severity: 'warn'
      };
      cache1.setCachedResultsForFile(fileA, [result]);
      cache1.saveCache();

      // Second scan (nothing changed)
      const scanner2 = new Scanner(root, config);
      const context2 = await scanner2.createContext();
      const cache2 = scanner2.getCacheService();

      expect(context2.dirtyFiles).toHaveLength(0);

      // Should return cached results
      const cachedResults = cache2.getAllCachedResults();
      expect(cachedResults).toHaveLength(1);
      expect(cachedResults[0].message).toBe('Cached issue');
    });

    it('clears cached results when config changes', async () => {
      const fileA = path.join(root, 'src/a.ts').replace(/\\/g, '/');

      const cacheStorage = new Map<string, string>();

      vi.mocked(fs.existsSync).mockImplementation((p) => cacheStorage.has(p as string));
      vi.mocked(fs.writeFileSync).mockImplementation((p, data) => {
        cacheStorage.set(p as string, data as string);
      });
      vi.mocked(fg).mockResolvedValue([fileA]);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const s = p as string;
        if (s === cachePath) return cacheStorage.get(s) || '';
        return 'content';
      });
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 1000 } as any);

      // First scan with config hash "A"
      const scanner1 = new Scanner(root, config);
      await scanner1.createContext();
      const cache1 = scanner1.getCacheService();

      cache1.setCachedResultsForFile(fileA, [
        { ruleId: 'old-rule', file: fileA, message: 'Old result', severity: 'error' }
      ]);
      cache1.setConfigHash('config-hash-A');
      cache1.saveCache();

      // Second scan — verify config hash differs
      const scanner2 = new Scanner(root, config);
      await scanner2.createContext();
      const cache2 = scanner2.getCacheService();

      expect(cache2.getConfigHash()).toBe('config-hash-A');

      // Simulate config change: clear all results
      cache2.setConfigHash('config-hash-B');
      cache2.clearAllResults();
      cache2.saveCache();

      // Third scan — verify results were purged
      const scanner3 = new Scanner(root, config);
      await scanner3.createContext();
      const cache3 = scanner3.getCacheService();

      expect(cache3.getConfigHash()).toBe('config-hash-B');
      expect(cache3.getAllCachedResults()).toHaveLength(0);
    });

    it('prunes results for deleted files', async () => {
      const fileA = path.join(root, 'src/a.ts').replace(/\\/g, '/');
      const fileB = path.join(root, 'src/b.ts').replace(/\\/g, '/');

      const cacheStorage = new Map<string, string>();

      vi.mocked(fs.existsSync).mockImplementation((p) => cacheStorage.has(p as string));
      vi.mocked(fs.writeFileSync).mockImplementation((p, data) => {
        cacheStorage.set(p as string, data as string);
      });
      vi.mocked(fg).mockResolvedValue([fileA, fileB]);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const s = p as string;
        if (s === cachePath) return cacheStorage.get(s) || '';
        return 'content';
      });
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 1000 } as any);

      // First scan: both files present
      const scanner1 = new Scanner(root, config);
      await scanner1.createContext();
      const cache1 = scanner1.getCacheService();
      cache1.setCachedResultsForFile(fileA, [
        { ruleId: 'r', file: fileA, message: 'A issue', severity: 'error' }
      ]);
      cache1.setCachedResultsForFile(fileB, [
        { ruleId: 'r', file: fileB, message: 'B issue', severity: 'error' }
      ]);
      cache1.saveCache();

      // Second scan: fileB is deleted (only fileA in glob results)
      vi.mocked(fg).mockResolvedValue([fileA]);
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 1000 } as any);

      const scanner2 = new Scanner(root, config);
      await scanner2.createContext();
      const cache2 = scanner2.getCacheService();

      // fileB's results should have been pruned
      expect(cache2.getCachedResultsForFile(fileB)).toHaveLength(0);
      expect(cache2.getCachedResultsForFile(fileA)).toHaveLength(1);
    });
  });
});
