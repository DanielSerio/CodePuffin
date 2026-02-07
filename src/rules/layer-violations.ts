import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';
import { extractImports, resolveImport, isSourceCodeFile, matchFileToPattern } from '../utils/imports';

// Checks if an import from sourceLayer to targetLayer is allowed
function isImportAllowed(
  sourceLayer: string,
  targetLayer: string,
  allowed: { importer: string; imports: string[]; }[],
): boolean {
  // Same layer is always allowed
  if (sourceLayer === targetLayer) return true;

  // Find the rule for this source layer
  const rule = allowed.find(r => r.importer === sourceLayer);
  if (!rule) {
    // No rule defined means all imports are forbidden
    return false;
  }

  return rule.imports.includes(targetLayer);
}

export class LayerViolationsRule implements Rule {
  id = 'layer-violations';

  async run(context: ScanContext): Promise<RuleResult[]> {
    const config = context.config.rules?.['layer-violations'];
    if (!config) return [];

    const modulePatterns = context.config.modules || {};
    const { severity, allowed } = config;
    const results: RuleResult[] = [];
    const knownFiles = new Set(context.allFiles.map(f => f.replace(/\\/g, '/')));

    // Use centralized modules as layers
    const layerEntries = Object.entries(modulePatterns).map(([name, pattern]) => ({ name, pattern }));

    for (const filePath of context.files) {
      if (!isSourceCodeFile(filePath)) continue;

      const sourceLayer = matchFileToPattern(filePath, layerEntries, context.root);
      if (!sourceLayer) continue;

      const imports = extractImports(filePath, context.root, this.id);

      for (const { specifier, line } of imports) {
        const resolvedPath = resolveImport(
          specifier,
          filePath,
          knownFiles,
          context.root,
          context.config.project?.aliases
        );
        if (!resolvedPath) continue;

        const targetLayer = matchFileToPattern(resolvedPath, layerEntries, context.root);
        if (!targetLayer) continue;

        if (!isImportAllowed(sourceLayer, targetLayer, allowed)) {
          results.push({
            ruleId: this.id,
            file: filePath,
            line,
            message: `Layer violation: "${sourceLayer}" cannot import from "${targetLayer}" (importing "${specifier}")`,
            severity,
            suggestion: `Move the dependency to an allowed layer or update the allowed imports for "${sourceLayer}"`,
          });
        }
      }
    }

    return results;
  }
}
