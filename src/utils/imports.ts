import ts from 'typescript';
import path from 'path';
import pc from 'picocolors';
import { readFileSync, statSync } from 'fs';
import { minimatch } from 'minimatch';

// Extensions to try when resolving relative imports
export const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
// Index filenames to try when resolving directory imports
export const INDEX_FILES = RESOLVE_EXTENSIONS.map(ext => `index${ext}`);

// Maximum file size (2MB) — files larger than this are skipped to avoid memory exhaustion
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

// Returns true if the file has a TypeScript or JavaScript extension
export function isSourceCodeFile(filePath: string): boolean {
  return RESOLVE_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

// Matches a file against a list of named glob patterns.
// Returns the name of the first matching pattern, or undefined.
// Handles pattern expansion: trailing "/*" is expanded to "/**/*" for deep matching.
export function matchFileToPattern(
  filePath: string,
  entries: { name: string; pattern: string; }[],
  root: string,
): string | undefined {
  const relativePath = path.relative(root, filePath).replace(/\\/g, '/');

  for (const { name, pattern } of entries) {
    const expandedPattern = pattern.endsWith('/*')
      ? pattern.slice(0, -2) + '/**/*'
      : pattern;

    if (minimatch(relativePath, expandedPattern) || minimatch(relativePath, pattern)) {
      return name;
    }
  }

  return undefined;
}

// Resolves an import specifier to an absolute file path.
// Handles relative imports and configured aliases.
// Returns undefined if the file cannot be found.
export function resolveImport(
  importPath: string,
  fromFile: string,
  knownFiles: Set<string>,
  root: string,
  aliases: Record<string, string> = {},
): string | undefined {
  let targetPath = importPath;

  // 1. Handle Alises
  for (const [alias, replacement] of Object.entries(aliases)) {
    // Exact match: "@/features" -> "src/features"
    if (alias.endsWith('/*') && replacement.endsWith('/*')) {
      const aliasPrefix = alias.slice(0, -2);
      const replacementPrefix = replacement.slice(0, -2);
      if (importPath.startsWith(aliasPrefix)) {
        targetPath = importPath.replace(aliasPrefix, replacementPrefix);
        // If it was an alias, it's now a root-relative path (usually starting with src/)
        // We should resolve it relative to root
        return resolveFile(path.resolve(root, targetPath), knownFiles);
      }
    } else if (importPath === alias) {
      targetPath = replacement;
      return resolveFile(path.resolve(root, targetPath), knownFiles);
    }
  }

  // 2. Handle Relative Imports
  if (importPath.startsWith('.')) {
    const dir = path.dirname(fromFile);
    const resolved = path.resolve(dir, importPath);
    return resolveFile(resolved, knownFiles);
  }

  return undefined;
}

// Helper to check exact file, extensions, and index files
function resolveFile(absolutePath: string, knownFiles: Set<string>): string | undefined {
  const normalized = absolutePath.replace(/\\/g, '/');

  // Try exact match
  if (knownFiles.has(normalized)) return normalized;

  // Try extensions
  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = normalized + ext;
    if (knownFiles.has(candidate)) return candidate;
  }

  // Try index files
  for (const indexFile of INDEX_FILES) {
    const candidate = normalized + '/' + indexFile;
    if (knownFiles.has(candidate)) return candidate;
  }

  return undefined;
}

// Extracts all import/export/dynamic-import specifiers from a TypeScript/JavaScript file.
// The ruleId parameter controls the warning label when a file can't be parsed.
// Skips files larger than MAX_FILE_SIZE_BYTES to avoid memory exhaustion.
export function extractImports(
  filePath: string,
  root: string,
  ruleId = 'scanner',
): { specifier: string; line: number; }[] {
  const imports: { specifier: string; line: number; }[] = [];

  try {
    // Skip oversized files to prevent memory exhaustion
    const stats = statSync(filePath);
    if (stats.size > MAX_FILE_SIZE_BYTES) {
      const rel = path.relative(root, filePath);
      const sizeMb = (stats.size / 1024 / 1024).toFixed(1);
      console.warn(pc.yellow(`[${ruleId}] Skipping oversized file (${sizeMb}MB): ${rel}`));
      return imports;
    }

    const content = readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const walk = (node: ts.Node) => {
      // import x from './y'
      if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
        const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        imports.push({ specifier, line });
      }

      // export { x } from './y'
      if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        imports.push({ specifier, line });
      }

      // import('./y')
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0) {
        const arg = node.arguments[0];
        if (ts.isStringLiteral(arg)) {
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          imports.push({ specifier: arg.text, line });
        }
      }

      ts.forEachChild(node, walk);
    };

    walk(sourceFile);
  } catch (err) {
    const rel = path.relative(root, filePath);
    console.warn(pc.yellow(`[${ruleId}] Skipping unparseable file: ${rel}`));
  }

  return imports;
}
