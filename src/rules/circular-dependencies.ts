import path from 'path';
import { minimatch } from 'minimatch';
import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';
import { resolveImport, extractImports } from '../utils/imports';

// Builds a directed graph of imports between files.
// Only includes edges for relative imports to files within the project.
export function buildImportGraph(
  files: string[],
  context: ScanContext,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  const knownFiles = new Set(files.map(f => f.replace(/\\/g, '/')));

  for (const filePath of files) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const edges = new Set<string>();
    graph.set(normalizedPath, edges);

    const imports = extractImports(filePath, context.root, 'circular-dependencies');
    for (const { specifier } of imports) {
      const resolved = resolveImport(
        specifier,
        normalizedPath,
        knownFiles,
        context.root,
        context.config.project?.aliases
      );
      if (resolved) {
        edges.add(resolved);
      }
    }
  }

  return graph;
}

// Detects cycles in the directed graph using DFS with back-edge detection.
// Each cycle is normalized so the lexicographically smallest path is first, for deduplication.
//
// NOTE: This uses a simple DFS that permanently marks nodes as visited. If a node is
// reachable via multiple paths, cycles through later paths may not be discovered. For most
// practical codebases this finds the significant cycles, but it is not an exhaustive
// algorithm (e.g., Johnson's algorithm would enumerate all elementary cycles).
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

    const { severity, maxDepth, ignorePaths } = config;

    // Filter out files matching ignorePaths patterns
    let files = context.files;
    if (ignorePaths && ignorePaths.length > 0) {
      files = files.filter(f => {
        const rel = path.relative(context.root, f).replace(/\\/g, '/');
        return !ignorePaths.some(pattern => minimatch(rel, pattern));
      });
    }

    const graph = buildImportGraph(files, context);
    let cycles = detectCycles(graph);

    // Filter cycles by maxDepth (max number of files in the cycle)
    if (maxDepth !== undefined) {
      cycles = cycles.filter(cycle => cycle.length <= maxDepth);
    }

    return cycles.map(cycle => {
      // Build the display path chain with relative paths
      const relativeCycle = cycle.map(f => path.relative(context.root, f).replace(/\\/g, '/'));
      // Close the loop in the message
      const chain = [...relativeCycle, relativeCycle[0]].join(' -> ');

      return {
        ruleId: this.id,
        file: cycle[0],
        message: `Circular dependency detected: ${chain}`,
        severity,
        suggestion: 'Break the cycle by extracting shared code into a separate module or using dependency injection',
      };
    });
  }
}
