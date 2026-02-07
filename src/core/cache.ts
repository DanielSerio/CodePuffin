import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CacheEntry {
  hash: string;
  mtime: number;
  imports: string[]; // List of resolved absolute paths this file imports
}

export interface PuffinCache {
  version: string;
  files: Record<string, CacheEntry>;
}

const CACHE_FILE_NAME = '.puffin-cache.json';
const CURRENT_VERSION = '1.1.0';

export class CacheService {
  private cachePath: string;
  private cache: PuffinCache;

  constructor(root: string) {
    this.cachePath = path.join(root, CACHE_FILE_NAME);
    this.cache = this.loadCache();
  }

  private loadCache(): PuffinCache {
    try {
      if (fs.existsSync(this.cachePath)) {
        const content = fs.readFileSync(this.cachePath, 'utf8');
        const parsed = JSON.parse(content);
        if (parsed.version === CURRENT_VERSION) {
          return parsed;
        }
      }
    } catch (e) {
      // Ignore cache load errors
    }
    return { version: CURRENT_VERSION, files: {} };
  }

  private hasChanges = false;

  saveCache(): void {
    if (!this.hasChanges) return;

    try {
      const dir = path.dirname(this.cachePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cachePath, JSON.stringify(this.cache, null, 2));
      this.hasChanges = false;
    } catch (e) {
      // Ignore cache save errors
    }
  }

  /**
   * Removes files from the cache that are no longer present in the project.
   */
  prune(validFiles: string[]): void {
    const validSet = new Set(validFiles);
    for (const cachedPath of Object.keys(this.cache.files)) {
      if (!validSet.has(cachedPath)) {
        delete this.cache.files[cachedPath];
        this.hasChanges = true;
      }
    }
  }

  getFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Updates the imports for a file in the cache.
   */
  updateImports(filePath: string, imports: string[]): void {
    const entry = this.cache.files[filePath];
    if (entry) {
      if (JSON.stringify(entry.imports) !== JSON.stringify(imports)) {
        entry.imports = imports;
        this.hasChanges = true;
      }
    }
  }

  /**
   * Gets all imports for a file from the cache.
   */
  getImports(filePath: string): string[] {
    return this.cache.files[filePath]?.imports || [];
  }

  /**
   * Checks if a file has changed and updates the cache.
   * Returns true if the file is "dirty" (changed or new).
   */
  isDirty(filePath: string): boolean {
    const stats = fs.statSync(filePath);
    const mtime = stats.mtimeMs;
    const entry = this.cache.files[filePath];

    if (entry && entry.mtime === mtime) {
      return false;
    }

    const currentHash = this.getFileHash(filePath);
    if (entry && entry.hash === currentHash) {
      // mtime changed but content didn't. Update mtime to avoid hashing next time.
      this.cache.files[filePath].mtime = mtime;
      // Defensive: Ensure imports is initialized even for old cache entries
      if (!this.cache.files[filePath].imports) {
        this.cache.files[filePath].imports = [];
      }
      this.hasChanges = true;
      return false;
    }

    // File is dirty. Note: we preserve existing imports to allow blast radius calculation before re-parsing
    this.cache.files[filePath] = {
      hash: currentHash,
      mtime: mtime,
      imports: entry?.imports || []
    };
    this.hasChanges = true;
    return true;
  }

  /**
   * Calculates the full list of "dirty" files, including those affected by 
   * changes in their dependencies (the blast radius).
   */
  getDirtyWithDependents(dirtyFiles: string[]): string[] {
    const result = new Set<string>(dirtyFiles);

    // Build reverse dependency map (Dependency -> Importers)
    const importersMap = new Map<string, Set<string>>();
    for (const [importer, entry] of Object.entries(this.cache.files)) {
      if (entry.imports) {
        for (const dep of entry.imports) {
          if (!importersMap.has(dep)) importersMap.set(dep, new Set());
          importersMap.get(dep)!.add(importer);
        }
      }
    }

    // Ripple effect: add importers of dirty files to the dirty set
    // For now, we only go 1 level deep as most architectural rules (Public API, Boundaries)
    // are concerned with direct imports.
    for (const dirtyFile of dirtyFiles) {
      const importers = importersMap.get(dirtyFile);
      if (importers) {
        for (const importer of importers) {
          result.add(importer);
        }
      }
    }

    return Array.from(result);
  }
}
