import { minimatch } from 'minimatch';
import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';
import { extractImports, resolveImport, isSourceCodeFile, matchFileToPattern } from '../utils/imports';

export class ModuleBoundariesRule implements Rule {
  id = 'module-boundaries';

  async run(context: ScanContext): Promise<RuleResult[]> {
    const config = context.config.rules?.['module-boundaries'];
    if (!config) return [];

    const { severity, modules: modulePatterns, rules: boundaryRules } = config;
    const results: RuleResult[] = [];
    const knownFiles = new Set(context.files.map(f => f.replace(/\\/g, '/')));

    // Convert Record<string, string> to { name, pattern }[] for matchFileToPattern
    const moduleEntries = Object.entries(modulePatterns).map(([name, pattern]) => ({ name, pattern }));

    for (const filePath of context.files) {
      if (!isSourceCodeFile(filePath)) continue;

      const sourceModule = matchFileToPattern(filePath, moduleEntries, context.root);
      if (!sourceModule) continue;

      const imports = extractImports(filePath, context.root, this.id);

      for (const { specifier, line } of imports) {
        // Skip non-relative imports (npm packages, aliases)
        if (!specifier.startsWith('.')) continue;

        const resolvedPath = resolveImport(specifier, filePath, knownFiles);
        if (!resolvedPath) continue;

        const targetModule = matchFileToPattern(resolvedPath, moduleEntries, context.root);
        if (!targetModule) continue;

        // Check boundary rules
        for (const rule of boundaryRules) {
          const fromMatches = minimatch(sourceModule, rule.from) || sourceModule === rule.from;
          const toMatches = minimatch(targetModule, rule.to) || targetModule === rule.to;

          if (fromMatches && toMatches && !rule.allow) {
            const message = rule.message
              || `Module "${sourceModule}" cannot import from "${targetModule}"`;

            results.push({
              ruleId: this.id,
              file: filePath,
              line,
              message: `${message} (importing "${specifier}")`,
              severity,
              suggestion: `Remove the import or update module boundary rules to allow "${sourceModule}" -> "${targetModule}"`,
            });
          }
        }
      }
    }

    return results;
  }
}
