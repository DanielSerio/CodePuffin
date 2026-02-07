import pc from 'picocolors';
import { Rule, RuleResult } from './rules';
import { ScanContext } from './scanner';

// Maximum time a single rule can run before being skipped (30 seconds)
const RULE_TIMEOUT_MS = 30_000;

export class Runner {
  private rules: Rule[] = [];

  addRule(rule: Rule) {
    this.rules.push(rule);
  }

  async run(context: ScanContext): Promise<RuleResult[]> {
    const results = await Promise.all(
      this.rules.map(async rule => {
        try {
          return await Promise.race([
            rule.run(context),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`timed out after ${RULE_TIMEOUT_MS}ms`)), RULE_TIMEOUT_MS),
            ),
          ]);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(pc.yellow(`[CodePuffin] Rule "${rule.id}" ${message}, skipping.`));
          return [] as RuleResult[];
        }
      }),
    );
    return results.flat();
  }
}
