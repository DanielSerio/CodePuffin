import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Scanner } from '../src/core/scanner';
import { Config } from '../src/core/config';
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

  it('🟢 GREEN: detects which files have changed based on content hashing', async () => {
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
    it('🔴 RED: marks dependents of dirty files as dirty', async () => {
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
});
