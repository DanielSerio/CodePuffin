import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { RuleResult } from './rules';

export interface CacheEntry {
  hash: string;
  mtime: number;
  imports: string[]; // Relative paths this file imports
}

export interface PuffinCache {
  version: string;
  configHash: string; // Hash of the rule configuration to detect config changes
  files: Record<string, CacheEntry>; // Keyed by relative path
  results: Record<string, RuleResult[]>; // Keyed by relative path, file fields are relative
}

const CACHE_FILE_NAME = '.puffin-cache.json';
// Bumped from 2.0.0: paths are now stored relative to project root for portability
const CURRENT_VERSION = '2.1.0';

export class CacheService {
  private root: string;
  private cachePath: string;
  private cache: PuffinCache;

  constructor(root: string) {
    this.root = root;
    this.cachePath = path.join(root, CACHE_FILE_NAME);
    this.cache = this.loadCache();
  }

  // Convert an absolute path to a relative cache key (forward slashes)
  private toKey(absPath: string): string {
    return path.relative(this.root, absPath).replace(/\\/g, '/');
  }

  // Convert a relative cache key back to an absolute path (forward slashes)
  private fromKey(relPath: string): string {
    return path.resolve(this.root, relPath).replace(/\\/g, '/');
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
    return { version: CURRENT_VERSION, configHash: '', files: {}, results: {} };
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
   * Accepts absolute paths (as the rest of the codebase uses).
   */
  prune(validFiles: string[]): void {
    const validKeys = new Set(validFiles.map(f => this.toKey(f)));
    for (const cachedKey of Object.keys(this.cache.files)) {
      if (!validKeys.has(cachedKey)) {
        delete this.cache.files[cachedKey];
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
   * Accepts absolute paths; stores them as relative.
   */
  updateImports(filePath: string, imports: string[]): void {
    const key = this.toKey(filePath);
    const entry = this.cache.files[key];
    if (entry) {
      const relImports = imports.map(i => this.toKey(i));
      const changed =
        entry.imports.length !== relImports.length ||
        !relImports.every((imp, i) => imp === entry.imports[i]);
      if (changed) {
        entry.imports = relImports;
        this.hasChanges = true;
      }
    }
  }

  /**
   * Gets all imports for a file from the cache.
   * Returns absolute paths.
   */
  getImports(filePath: string): string[] {
    const key = this.toKey(filePath);
    const imports = this.cache.files[key]?.imports;
    if (!imports) return [];
    return imports.map(i => this.fromKey(i));
  }

  /**
   * Checks if a file has changed and updates the cache.
   * Returns true if the file is "dirty" (changed or new).
   */
  isDirty(filePath: string): boolean {
    const key = this.toKey(filePath);
    const stats = fs.statSync(filePath);
    const mtime = stats.mtimeMs;
    const entry = this.cache.files[key];

    if (entry && entry.mtime === mtime) {
      return false;
    }

    const currentHash = this.getFileHash(filePath);
    if (entry && entry.hash === currentHash) {
      // mtime changed but content didn't. Update mtime to avoid hashing next time.
      entry.mtime = mtime;
      // Defensive: Ensure imports is initialized even for old cache entries
      if (!entry.imports) {
        entry.imports = [];
      }
      this.hasChanges = true;
      return false;
    }

    // File is dirty. Note: we preserve existing imports to allow blast radius calculation before re-parsing
    this.cache.files[key] = {
      hash: currentHash,
      mtime: mtime,
      imports: entry?.imports || []
    };
    this.hasChanges = true;
    return true;
  }

  // --- Result Caching ---

  /**
   * Returns the cached config hash, or empty string if not set.
   */
  getConfigHash(): string {
    return this.cache.configHash || '';
  }

  /**
   * Sets the config hash in the cache.
   */
  setConfigHash(hash: string): void {
    if (this.cache.configHash !== hash) {
      this.cache.configHash = hash;
      this.hasChanges = true;
    }
  }

  /**
   * Stores rule results for a given file.
   * Accepts absolute filePath; converts result.file to relative for storage.
   */
  setCachedResultsForFile(filePath: string, results: RuleResult[]): void {
    const key = this.toKey(filePath);
    this.cache.results[key] = results.map(r => ({
      ...r,
      file: this.toKey(r.file),
    }));
    this.hasChanges = true;
  }

  /**
   * Returns cached rule results for a given file, or empty array if none.
   * Converts result.file back to absolute paths.
   */
  getCachedResultsForFile(filePath: string): RuleResult[] {
    const key = this.toKey(filePath);
    const cached = this.cache.results[key];
    if (!cached) return [];
    return cached.map(r => ({
      ...r,
      file: this.fromKey(r.file),
    }));
  }

  /**
   * Returns all cached results across all files.
   * Converts result.file back to absolute paths.
   */
  getAllCachedResults(): RuleResult[] {
    return Object.values(this.cache.results).flat().map(r => ({
      ...r,
      file: this.fromKey(r.file),
    }));
  }

  /**
   * Clears cached results for the given files (absolute paths).
   */
  clearResultsForFiles(filePaths: string[]): void {
    for (const f of filePaths) {
      const key = this.toKey(f);
      if (this.cache.results[key]) {
        delete this.cache.results[key];
        this.hasChanges = true;
      }
    }
  }

  /**
   * Clears all cached results (used on config change or --clean).
   */
  clearAllResults(): void {
    if (Object.keys(this.cache.results).length > 0) {
      this.cache.results = {};
      this.hasChanges = true;
    }
  }

  /**
   * Prunes cached results for files that no longer exist in the project.
   * Accepts absolute paths.
   */
  pruneResults(validFiles: string[]): void {
    const validKeys = new Set(validFiles.map(f => this.toKey(f)));
    for (const cachedKey of Object.keys(this.cache.results)) {
      if (!validKeys.has(cachedKey)) {
        delete this.cache.results[cachedKey];
        this.hasChanges = true;
      }
    }
  }

  /**
   * Calculates the full list of "dirty" files, including those affected by
   * changes in their dependencies (the blast radius).
   * Accepts and returns absolute paths.
   */
  getDirtyWithDependents(dirtyFiles: string[]): string[] {
    const dirtyKeys = new Set(dirtyFiles.map(f => this.toKey(f)));
    const resultKeys = new Set<string>(dirtyKeys);

    // Build reverse dependency map from cached relative paths (Dependency -> Importers)
    const importersMap = new Map<string, Set<string>>();
    for (const [importerKey, entry] of Object.entries(this.cache.files)) {
      if (entry.imports) {
        for (const depKey of entry.imports) {
          if (!importersMap.has(depKey)) importersMap.set(depKey, new Set());
          importersMap.get(depKey)!.add(importerKey);
        }
      }
    }

    // Ripple effect: add importers of dirty files to the dirty set
    // For now, we only go 1 level deep as most architectural rules (Public API, Boundaries)
    // are concerned with direct imports.
    for (const dirtyKey of dirtyKeys) {
      const importers = importersMap.get(dirtyKey);
      if (importers) {
        for (const importerKey of importers) {
          resultKeys.add(importerKey);
        }
      }
    }

    return Array.from(resultKeys).map(k => this.fromKey(k));
  }
}
