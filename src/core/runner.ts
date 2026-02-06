import { Rule, RuleResult } from './rules';
import { ScanContext } from './scanner';

export class Runner {
  private rules: Rule[] = [];

  addRule(rule: Rule) {
    this.rules.push(rule);
  }

  async run(context: ScanContext): Promise<RuleResult[]> {
    const allResults: RuleResult[] = [];

    for (const rule of this.rules) {
      const results = await rule.run(context);
      allResults.push(...results);
    }

    return allResults;
  }
}
