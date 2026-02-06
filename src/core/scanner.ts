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
    this.root = path.resolve(root);
    this.config = config;
  }

  async createContext(): Promise<ScanContext> {
    const include = this.config.project?.include || ['src/**/*'];
    const exclude = this.config.project?.exclude || ['node_modules', 'dist', '**/*.test.*'];

    // 1. Get all files matching project patterns, filtered to source code only
    const allFiles = await fg(include, {
      cwd: this.root,
      ignore: exclude,
      absolute: true,
      onlyFiles: true,
    });
    const files = allFiles.filter(isSourceFile);

    // 2. Resolve modules
    const modules: Record<string, string[]> = {};
    if (this.config.modules) {
      for (const [name, pattern] of Object.entries(this.config.modules)) {
        // Handle bracket expansion if needed, but fast-glob handles it mostly.
        // We filter the already found files to ensure we only include what's in the project.
        const moduleFiles = await fg(pattern as string, {
          cwd: this.root,
          ignore: exclude,
          absolute: true,
          onlyFiles: true,
        });

        modules[name] = moduleFiles.filter(isSourceFile);
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
