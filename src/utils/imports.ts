import ts from 'typescript';
import path from 'path';
import pc from 'picocolors';
import { readFileSync } from 'fs';

// Extensions to try when resolving relative imports
export const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
// Index filenames to try when resolving directory imports
export const INDEX_FILES = RESOLVE_EXTENSIONS.map(ext => `index${ext}`);

// Resolves a relative import specifier to an absolute file path.
// Tries exact match, then extensions, then directory index files.
// Returns undefined if the file cannot be found.
export function resolveImport(
  importPath: string,
  fromFile: string,
  knownFiles: Set<string>,
): string | undefined {
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(dir, importPath);
  const normalized = resolved.replace(/\\/g, '/');

  // Try exact match first
  if (knownFiles.has(normalized)) return normalized;

  // Try adding extensions
  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = normalized + ext;
    if (knownFiles.has(candidate)) return candidate;
  }

  // Try as a directory with index file
  for (const indexFile of INDEX_FILES) {
    const candidate = normalized + '/' + indexFile;
    if (knownFiles.has(candidate)) return candidate;
  }

  return undefined;
}

// Extracts all import/export/dynamic-import specifiers from a TypeScript/JavaScript file.
// The ruleId parameter controls the warning label when a file can't be parsed.
export function extractImports(
  filePath: string,
  root: string,
  ruleId = 'scanner',
): { specifier: string; line: number }[] {
  const imports: { specifier: string; line: number }[] = [];

  try {
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
