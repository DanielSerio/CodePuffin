import fg from 'fast-glob';
import path from 'path';
import { Config } from './config';

// Only scan text-based source files; skip binaries, images, fonts, etc.
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.vue', '.svelte', '.astro',
  '.css', '.scss', '.less',
  '.html', '.json', '.yaml', '.yml',
  '.md', '.mdx',
]);

function isSourceFile(filePath: string): boolean {
  return SOURCE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

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
    // Normalize root to forward slashes to match discovered file paths
    this.root = path.resolve(root).replace(/\\/g, '/');
    this.config = config;
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

    // 2. Resolve modules
    const modules: Record<string, string[]> = {};
    if (this.config.modules) {
      for (const [name, pattern] of Object.entries(this.config.modules)) {
        const moduleFiles = await fg(normalizeGlob(pattern as string), {
          cwd: this.root,
          ignore: exclude,
          absolute: true,
          onlyFiles: true,
        });

        modules[name] = moduleFiles.map(f => f.replace(/\\/g, '/')).filter(isSourceFile);
      }
    }

    return {
      root: this.root,
      config: this.config,
      files,
      modules,
    };
  }

}
