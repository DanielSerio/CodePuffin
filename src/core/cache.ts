import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CacheEntry {
  hash: string;
  mtime: number;
}

export interface PuffinCache {
  version: string;
  files: Record<string, CacheEntry>;
}

const CACHE_FILE_NAME = '.puffin-cache.json';
const CURRENT_VERSION = '1.0.0';

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
      this.hasChanges = true;
      return false;
    }

    // File is dirty
    this.cache.files[filePath] = {
      hash: currentHash,
      mtime: mtime
    };
    this.hasChanges = true;
    return true;
  }
}
