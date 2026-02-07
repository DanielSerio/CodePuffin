import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';
import { extractImports, resolveImport, isSourceCodeFile, matchFileToPattern } from '../utils/imports';

// Checks if an import from sourceLayer to targetLayer is allowed
function isImportAllowed(
  sourceLayer: string,
  targetLayer: string,
  allowed: { from: string; to: string[] }[],
): boolean {
  // Same layer is always allowed
  if (sourceLayer === targetLayer) return true;

  // Find the rule for this source layer
  const rule = allowed.find(r => r.from === sourceLayer);
  if (!rule) {
    // No rule defined means all imports are forbidden
    return false;
  }

  return rule.to.includes(targetLayer);
}

export class LayerViolationsRule implements Rule {
  id = 'layer-violations';

  async run(context: ScanContext): Promise<RuleResult[]> {
    const config = context.config.rules?.['layer-violations'];
    if (!config) return [];

    const { severity, layers, allowed } = config;
    const results: RuleResult[] = [];
    const knownFiles = new Set(context.files.map(f => f.replace(/\\/g, '/')));

    for (const filePath of context.files) {
      if (!isSourceCodeFile(filePath)) continue;

      const sourceLayer = matchFileToPattern(filePath, layers, context.root);
      if (!sourceLayer) continue;

      const imports = extractImports(filePath, context.root, this.id);

      for (const { specifier, line } of imports) {
        // Skip non-relative imports (npm packages, aliases)
        if (!specifier.startsWith('.')) continue;

        const resolvedPath = resolveImport(specifier, filePath, knownFiles);
        if (!resolvedPath) continue;

        const targetLayer = matchFileToPattern(resolvedPath, layers, context.root);
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
