import { Rule, RuleResult } from './rules';
import { ScanContext } from './scanner';

export class Runner {
  private rules: Rule[] = [];

  addRule(rule: Rule) {
    this.rules.push(rule);
  }

  async run(context: ScanContext): Promise<RuleResult[]> {
    const results = await Promise.all(
      this.rules.map(rule => rule.run(context))
    );
    return results.flat();
  }
}
