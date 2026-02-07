import path from 'path';
import { minimatch } from 'minimatch';
import { ScanContext } from './scanner';
import { extractImports, resolveImport, isSourceCodeFile, matchFileToPattern } from '../utils/imports';

export interface ModuleEdge {
  from: string;
  to: string;
  isViolation: boolean;
}

/**
 * Builds a module-level dependency graph based on file imports.
 * It aggregates file-to-file imports into module-to-module edges.
 */
export function buildModuleGraph(context: ScanContext): ModuleEdge[] {
  const edges: ModuleEdge[] = [];
  const edgeKeys = new Set<string>();
  const knownFiles = new Set(context.files.map(f => f.replace(/\\/g, '/')));

  const globalModules = context.config.modules || {};
  if (Object.keys(globalModules).length === 0) return [];

  const modulePatterns = Object.entries(globalModules).map(([name, pattern]) => ({ name, pattern }));
  const boundaryRules = context.config.rules?.['module-boundaries']?.rules || [];

  for (const filePath of context.files) {
    if (!isSourceCodeFile(filePath)) continue;

    const sourceModule = matchFileToPattern(filePath, modulePatterns, context.root);
    if (!sourceModule) continue;

    const imports = extractImports(filePath, context.root, 'graph-gen');
    for (const { specifier } of imports) {
      const resolved = resolveImport(
        specifier,
        filePath,
        knownFiles,
        context.root,
        context.config.project?.aliases
      );
      if (!resolved) continue;

      const targetModule = matchFileToPattern(resolved, modulePatterns, context.root);
      if (!targetModule) continue;

      // Only skip self-loops if they aren't explicitly forbidden by rules
      // (e.g. "features" -> "features" could be a violation)
      let isViolation = false;
      for (const rule of boundaryRules) {
        const fromMatches = minimatch(sourceModule, rule.importer) || sourceModule === rule.importer;
        const toMatches = minimatch(targetModule, rule.imports) || targetModule === rule.imports;
        if (fromMatches && toMatches && !rule.allow) {
          isViolation = true;
          break;
        }
      }

      if (targetModule === sourceModule && !isViolation) continue;

      const key = `${sourceModule}->${targetModule}`;
      if (!edgeKeys.has(key)) {
        edgeKeys.add(key);
        edges.push({ from: sourceModule, to: targetModule, isViolation });
      }
    }
  }

  return edges;
}

/**
 * Generates a Mermaid flowchart string from the module edges.
 * Highlights violations with red dashed lines.
 */
export function generateMermaid(edges: ModuleEdge[]): string {
  if (edges.length === 0) return '%% No module dependencies detected';

  const lines = ['flowchart TD'];

  // Map module names to safe IDs (Mermaid IDs shouldn't have @ or spaces)
  const safeId = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '_');

  // Track unique modules to define their labels
  const modules = new Set<string>();
  edges.forEach(e => {
    modules.add(e.from);
    modules.add(e.to);
  });

  // Define nodes
  for (const name of modules) {
    lines.push(`  ${safeId(name)}["${name}"]`);
  }

  // Define edges
  let edgeIndex = 0;
  for (const edge of edges) {
    const fromId = safeId(edge.from);
    const toId = safeId(edge.to);

    if (edge.isViolation) {
      lines.push(`  ${fromId} -. violation! .-> ${toId}`);
      lines.push(`  linkStyle ${edgeIndex} stroke:#ff0000,stroke-width:2px;`);
    } else {
      lines.push(`  ${fromId} --> ${toId}`);
    }
    edgeIndex++;
  }

  return lines.join('\n');
}
