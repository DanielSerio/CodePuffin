import ts from 'typescript';
import path from 'path';
import pc from 'picocolors';
import { readFileSync, existsSync } from 'fs';
import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';

// Extensions to try when resolving relative imports
const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
// Index filenames to try when resolving directory imports
const INDEX_FILES = RESOLVE_EXTENSIONS.map(ext => `index${ext}`);

// Resolves a relative import specifier to an absolute file path.
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

// Builds a directed graph of imports between files.
// Only includes edges for relative imports to files within the project.
export function buildImportGraph(
  files: string[],
  root: string,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  const knownFiles = new Set(files.map(f => f.replace(/\\/g, '/')));

  for (const filePath of files) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (!graph.has(normalizedPath)) {
      graph.set(normalizedPath, new Set());
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

      const walk = (node: ts.Node) => {
        // Handle import declarations: import x from './y'
        if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
          const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
          addEdge(normalizedPath, specifier, knownFiles, graph);
        }

        // Handle export declarations with module specifier: export { x } from './y'
        if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
          const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
          addEdge(normalizedPath, specifier, knownFiles, graph);
        }

        ts.forEachChild(node, walk);
      };

      walk(sourceFile);
    } catch (err) {
      const rel = path.relative(root, filePath);
      console.warn(pc.yellow(`[circular-dependencies] Skipping unparseable file: ${rel}`));
    }
  }

  return graph;
}

// Adds a directed edge from source to the resolved target (if it's a relative import)
function addEdge(
  fromFile: string,
  specifier: string,
  knownFiles: Set<string>,
  graph: Map<string, Set<string>>,
) {
  // Only process relative imports
  if (!specifier.startsWith('.')) return;

  const resolved = resolveImport(specifier, fromFile, knownFiles);
  if (resolved) {
    graph.get(fromFile)!.add(resolved);
  }
}

// Detects all unique cycles in the directed graph using DFS with back-edge detection.
// Each cycle is normalized so the lexicographically smallest path is first, for deduplication.
export function detectCycles(graph: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const seen = new Set<string>();

  function dfs(node: string) {
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    stack.push(node);

    const neighbors = graph.get(node) ?? new Set();
    for (const neighbor of neighbors) {
      if (inStack.has(neighbor)) {
        // Found a cycle - extract the path from neighbor to current position
        const cycleStart = stack.indexOf(neighbor);
        const cycle = stack.slice(cycleStart);

        // Normalize: rotate so lexicographically smallest path is first
        const normalized = normalizeCycle(cycle);
        const key = normalized.join(' -> ');

        if (!seen.has(key)) {
          seen.add(key);
          cycles.push(normalized);
        }
      } else if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }

    stack.pop();
    inStack.delete(node);
  }

  // Visit all nodes (handles disconnected components)
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

// Rotates cycle array so the lexicographically smallest element is first
function normalizeCycle(cycle: string[]): string[] {
  if (cycle.length === 0) return cycle;

  let minIdx = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i] < cycle[minIdx]) {
      minIdx = i;
    }
  }

  return [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
}

export class CircularDependenciesRule implements Rule {
  id = 'circular-dependencies';

  async run(context: ScanContext): Promise<RuleResult[]> {
    const config = context.config.rules?.['circular-dependencies'];
    if (!config) return [];

    const { severity } = config;
    const graph = buildImportGraph(context.files, context.root);
    const cycles = detectCycles(graph);

    return cycles.map(cycle => {
      // Build the display path chain with relative paths
      const relativeCycle = cycle.map(f => path.relative(context.root, f).replace(/\\/g, '/'));
      // Close the loop in the message
      const chain = [...relativeCycle, relativeCycle[0]].join(' -> ');

      return {
        ruleId: this.id,
        file: cycle[0], // Report against the first file in the normalized cycle
        message: `Circular dependency detected: ${chain}`,
        severity,
      };
    });
  }
}
