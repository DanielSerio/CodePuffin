import path from 'path';
import { minimatch } from 'minimatch';
import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';
import { extractImports, resolveImport } from '../utils/imports';

// Finds which module a file belongs to
function findModule(
  filePath: string,
  modulePatterns: Record<string, string>,
  root: string,
): string | undefined {
  const relativePath = path.relative(root, filePath).replace(/\\/g, '/');

  for (const [moduleName, pattern] of Object.entries(modulePatterns)) {
    // Handle patterns like "src/features/*" which should match "src/features/auth/index.ts"
    // by converting to "src/features/**/*"
    const expandedPattern = pattern.endsWith('/*')
      ? pattern.slice(0, -2) + '/**/*'
      : pattern;

    if (minimatch(relativePath, expandedPattern) || minimatch(relativePath, pattern)) {
      return moduleName;
    }
  }

  return undefined;
}

export class ModuleBoundariesRule implements Rule {
  id = 'module-boundaries';

  async run(context: ScanContext): Promise<RuleResult[]> {
    const config = context.config.rules?.['module-boundaries'];
    if (!config) return [];

    const { severity, modules: modulePatterns, rules: boundaryRules } = config;
    const results: RuleResult[] = [];
    const knownFiles = new Set(context.files.map(f => f.replace(/\\/g, '/')));

    for (const filePath of context.files) {
      // Only check TypeScript/JavaScript files
      if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath)) continue;

      const sourceModule = findModule(filePath, modulePatterns, context.root);
      if (!sourceModule) continue;

      const imports = extractImports(filePath, context.root, this.id);

      for (const { specifier, line } of imports) {
        // Skip non-relative imports (npm packages, aliases)
        if (!specifier.startsWith('.')) continue;

        const resolvedPath = resolveImport(specifier, filePath, knownFiles);
        if (!resolvedPath) continue;

        const targetModule = findModule(resolvedPath, modulePatterns, context.root);
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
            });
          }
        }
      }
    }

    return results;
  }
}
