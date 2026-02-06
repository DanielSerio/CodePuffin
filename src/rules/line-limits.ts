import { readFileSync } from 'fs';
import path from 'path';
import pc from 'picocolors';
import { Rule, RuleResult } from '../core/rules';
import { ScanContext } from '../core/scanner';

export class LineLimitsRule implements Rule {
  id = 'line-limits';

  async run(context: ScanContext): Promise<RuleResult[]> {
    const config = context.config.rules?.['line-limits'];
    if (!config) return [];

    const results: RuleResult[] = [];
    const { default: defaultLimit, overrides, severity } = config;

    for (const filePath of context.files) {
      let limit = defaultLimit;

      // Check for overrides
      if (overrides) {
        for (const [moduleRef, moduleLimit] of Object.entries(overrides)) {
          if (moduleRef.startsWith('@')) {
            const moduleName = moduleRef.slice(1);
            const moduleFiles = context.modules[moduleName];
            if (moduleFiles?.includes(filePath)) {
              limit = moduleLimit as number;
              break; // Use the first matching override
            }
          }
        }
      }

      try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.length === 0 ? 0 : content.split(/\r?\n/).length;

        if (lines > limit) {
          results.push({
            ruleId: this.id,
            file: filePath,
            message: `File exceeds line limit of ${limit} (current: ${lines})`,
            severity,
            suggestion: 'Consider refactoring this file by extracting logic into smaller components, hooks, or utility files.',
          });
        }
      } catch (err) {
        const rel = path.relative(context.root, filePath);
        console.warn(pc.yellow(`[line-limits] Skipping unreadable file: ${rel}`));
      }
    }

    return results;
  }
}
