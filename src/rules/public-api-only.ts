import path from 'path';
import { minimatch } from 'minimatch';
import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';
import { extractImports, resolveImport, isSourceCodeFile } from '../utils/imports';

// Resolves a potential module name (e.g. "@features") to its raw pattern from global registry
function resolvePattern(nameOrPattern: string, globalModules: Record<string, string>): string {
  return globalModules[nameOrPattern] || nameOrPattern;
}

// Checks if a file path matches any of the module patterns
function isInProtectedModule(
  filePath: string,
  patterns: string[],
  root: string,
): boolean {
  const relativePath = path.relative(root, filePath).replace(/\\/g, '/');

  for (const pattern of patterns) {
    // Check if this is a deep path into a protected module
    // e.g., pattern "src/features/*" should protect "src/features/auth/utils/helper.ts"
    const basePattern = pattern.replace(/\/\*$/, '');

    if (relativePath.startsWith(basePattern + '/') || minimatch(relativePath, pattern)) {
      return true;
    }
  }

  return false;
}

// Gets the expected public API path for a module
function getPublicApiPath(
  filePath: string,
  patterns: string[],
  root: string,
): string | undefined {
  const relativePath = path.relative(root, filePath).replace(/\\/g, '/');

  for (const pattern of patterns) {
    const basePattern = pattern.replace(/\/\*$/, '');

    if (relativePath.startsWith(basePattern + '/')) {
      // Extract the module name (first folder after the base)
      const afterBase = relativePath.slice(basePattern.length + 1);
      const moduleName = afterBase.split('/')[0];

      // Return expected public API path
      return `${basePattern}/${moduleName}`;
    }
  }

  return undefined;
}

// Checks if a file is exempt from the rule
function isExemptFile(
  filePath: string,
  exceptions: string[] | undefined,
  root: string,
): boolean {
  if (!exceptions || exceptions.length === 0) return false;

  const relativePath = path.relative(root, filePath).replace(/\\/g, '/');

  for (const pattern of exceptions) {
    if (minimatch(relativePath, pattern)) {
      return true;
    }
  }

  return false;
}

export class PublicApiOnlyRule implements Rule {
  id = 'public-api-only';

  async run(context: ScanContext): Promise<RuleResult[]> {
    const config = context.config.rules?.['public-api-only'];
    if (!config) return [];

    const globalModules = context.config.modules || {};
    const { severity, modules: inputPatterns, exceptions } = config;

    // Resolve any named modules to their patterns
    const modulePatterns = inputPatterns.map(p => resolvePattern(p, globalModules));

    const results: RuleResult[] = [];
    const knownFiles = new Set(context.allFiles.map(f => f.replace(/\\/g, '/')));

    for (const filePath of context.files) {
      if (!isSourceCodeFile(filePath)) continue;

      // Skip exempt files
      if (isExemptFile(filePath, exceptions, context.root)) continue;

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

        // Check if the import target is inside a protected module
        if (!isInProtectedModule(resolvedPath, modulePatterns, context.root)) continue;

        // Get the public API path
        const publicApiPath = getPublicApiPath(resolvedPath, modulePatterns, context.root);
        if (!publicApiPath) continue;

        // Check if this is a deep import (not through index)
        const targetRelative = path.relative(context.root, resolvedPath).replace(/\\/g, '/');

        // If importing the module folder directly (will resolve to index), that's fine
        if (targetRelative === publicApiPath || targetRelative.startsWith(publicApiPath + '/index.')) {
          continue;
        }

        // This is a deep import - it bypasses the public API
        const sourceRelative = path.relative(context.root, filePath).replace(/\\/g, '/');

        // Don't report if the source file is inside the same module
        if (targetRelative.startsWith(publicApiPath + '/') && sourceRelative.startsWith(publicApiPath + '/')) {
          continue;
        }

        results.push({
          ruleId: this.id,
          file: filePath,
          line,
          message: `Deep import detected: use the public API at "${publicApiPath}" instead of "${specifier}"`,
          severity,
          suggestion: `Import from "${publicApiPath}" instead`,
        });
      }
    }

    return results;
  }
}
