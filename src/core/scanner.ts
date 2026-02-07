import fg from 'fast-glob';
import path from 'path';
import { Config } from './config';
import { CacheService } from './cache';
import { extractImports, resolveImport } from '../utils/imports';

// Only scan text-based source files; skip binaries, images, fonts, etc.
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.vue', '.svelte', '.astro',
  '.css', '.scss', '.less',
  '.html', '.json', '.yaml', '.yml',
  '.md', '.mdx',
]);

export function isSourceFile(filePath: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

export interface ScanContext {
  root: string;
  config: Config;
  files: string[];       // Files to analyze (dirty files in incremental mode, all files in full mode)
  allFiles: string[];    // All discovered project files (always the full set, for import resolution)
  modules: Record<string, string[]>;
  dirtyFiles: string[];  // Files that have changed (or been affected by changes) since the last scan
}

export class Scanner {
  private root: string;
  private config: Config;
  private cache: CacheService;

  constructor(root: string, config: Config) {
    // Normalize root to forward slashes to match discovered file paths
    this.root = path.resolve(root).replace(/\\/g, '/');
    this.config = config;
    this.cache = new CacheService(this.root);
  }

  async createContext(): Promise<ScanContext> {
    const normalizeGlob = (p: string) => p.replace(/\\/g, '/');
    const include = (this.config.project?.include || ['src/**/*']).map(normalizeGlob);
    const exclude = (this.config.project?.exclude || ['node_modules', 'dist', '**/*.test.*']).map(normalizeGlob);

    // Validate that glob patterns don't attempt to escape the project root
    for (const pattern of [...include, ...exclude]) {
      if (pattern.includes('..')) {
        throw new Error(`Glob pattern "${pattern}" must not contain ".." to prevent path traversal`);
      }
      if (path.isAbsolute(pattern)) {
        throw new Error(`Glob pattern "${pattern}" must be relative to the project root`);
      }
    }

    // 1. Get all files matching project patterns, filtered to source code only
    const allFiles = await fg(include, {
      cwd: this.root,
      ignore: exclude,
      absolute: true,
      onlyFiles: true,
    });
    // Normalize discovered files to use forward slashes internally
    const files = allFiles.map(f => f.replace(/\\/g, '/')).filter(isSourceFile);
    const knownFiles = new Set(files);

    // 2. Resolve modules
    const modules: Record<string, string[]> = {};
    if (this.config.modules) {
      for (const [name, pattern] of Object.entries(this.config.modules)) {
        const normalized = normalizeGlob(pattern as string);
        const expandedPattern = normalized.endsWith('/*')
          ? normalized.slice(0, -2) + '/**/*'
          : normalized;

        const moduleFiles = await fg(expandedPattern, {
          cwd: this.root,
          ignore: exclude,
          absolute: true,
          onlyFiles: true,
        });

        modules[name] = moduleFiles.map(f => f.replace(/\\/g, '/')).filter(isSourceFile);
      }
    }

    // 3. Detect direct dirty files
    const directDirty: string[] = [];
    for (const f of files) {
      if (this.cache.isDirty(f)) {
        directDirty.push(f);
      }
    }

    // 4. Resolve blast radius (dependents of dirty files)
    const dirtyFiles = this.cache.getDirtyWithDependents(directDirty);

    // 5. Update imports for dirty files
    await Promise.all(directDirty.map(async (f) => {
      try {
        const rawImports = extractImports(f, this.root);
        const resolved = rawImports.map(i => resolveImport(
          i.specifier,
          f,
          knownFiles,
          this.root,
          this.config.project?.aliases
        )).filter((r): r is string => !!r);

        this.cache.updateImports(f, resolved);
      } catch (e) {
        // Skip files that fail to parse
      }
    }));

    this.cache.prune(files);
    this.cache.pruneResults(files);
    this.cache.saveCache();

    return {
      root: this.root,
      config: this.config,
      files,
      allFiles: files,
      modules,
      dirtyFiles,
    };
  }

  getCacheService(): CacheService {
    return this.cache;
  }
}
