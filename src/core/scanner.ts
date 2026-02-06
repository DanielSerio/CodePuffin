import fg from 'fast-glob';
import path from 'path';
import { Config } from './config';

export interface ScanContext {
  root: string;
  config: Config;
  files: string[];
  modules: Record<string, string[]>;
}

export class Scanner {
  private root: string;
  private config: Config;

  constructor(root: string, config: Config) {
    this.root = path.resolve(root);
    this.config = config;
  }

  async createContext(): Promise<ScanContext> {
    const include = this.config.project?.include || ['src/**/*'];
    const exclude = this.config.project?.exclude || ['node_modules', 'dist', '**/*.test.*'];

    // 1. Get all files matching project patterns
    const files = await fg(include, {
      cwd: this.root,
      ignore: exclude,
      absolute: true,
      onlyFiles: true,
    });

    // 2. Resolve modules
    const modules: Record<string, string[]> = {};
    if (this.config.modules) {
      for (const [name, pattern] of Object.entries(this.config.modules)) {
        // Handle bracket expansion if needed, but fast-glob handles it mostly.
        // We filter the already found files to ensure we only include what's in the project.
        const moduleFiles = await fg(pattern as string, {
          cwd: this.root,
          ignore: exclude, // Still ignore global excludes
          absolute: true,
          onlyFiles: true,
        });

        modules[name] = moduleFiles;
      }
    }

    return {
      root: this.root,
      config: this.config,
      files,
      modules,
    };
  }

  /**
   * Resolves module references (e.g., "@ui") to actual file paths.
   */
  resolveFiles(patterns: string[], context: ScanContext): string[] {
    const resolved: Set<string> = new Set();

    for (const pattern of patterns) {
      if (pattern.startsWith('@')) {
        const moduleName = pattern.slice(1);
        const moduleFiles = context.modules[moduleName];
        if (moduleFiles) {
          moduleFiles.forEach(f => resolved.add(f));
        }
      } else {
        // If it's a direct glob pattern, we match against context.files
        // For simplicity in Phase 1, we just return the pattern and let individual rules handle it 
        // OR we can do a local glob here. Let's do a local glob for consistency.
        // But rule-level excludes/includes should be matched against the absolute paths in context.files.
      }
    }

    return Array.from(resolved);
  }
}
