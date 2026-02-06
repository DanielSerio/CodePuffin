import { describe, it, expect } from 'vitest';
import { Runner } from '../src/core/runner';
import { Rule, RuleResult } from '../src/core/rules';
import { ScanContext } from '../src/core/scanner';
import { ConfigSchema } from '../src/core/config';

function createMockContext(files: string[] = []): ScanContext {
  return {
    root: '/test',
    config: ConfigSchema.parse({}),
    files,
    modules: {},
  };
}

function createMockRule(id: string, results: RuleResult[]): Rule {
  return {
    id,
    run: async () => results,
  };
}

describe('Runner', () => {
  it('returns empty results when no rules are added', async () => {
    const runner = new Runner();
    const results = await runner.run(createMockContext());
    expect(results).toEqual([]);
  });

  it('collects results from a single rule', async () => {
    const runner = new Runner();
    const expected: RuleResult[] = [
      { ruleId: 'test-rule', file: '/test/a.ts', message: 'issue found', severity: 'warn' },
    ];

    runner.addRule(createMockRule('test-rule', expected));
    const results = await runner.run(createMockContext());

    expect(results).toEqual(expected);
  });

  it('collects results from multiple rules', async () => {
    const runner = new Runner();

    runner.addRule(createMockRule('rule-a', [
      { ruleId: 'rule-a', file: '/test/a.ts', message: 'a', severity: 'warn' },
    ]));
    runner.addRule(createMockRule('rule-b', [
      { ruleId: 'rule-b', file: '/test/b.ts', message: 'b', severity: 'error' },
    ]));

    const results = await runner.run(createMockContext());

    expect(results).toHaveLength(2);
    expect(results.map(r => r.ruleId)).toContain('rule-a');
    expect(results.map(r => r.ruleId)).toContain('rule-b');
  });

  it('runs rules concurrently', async () => {
    const runner = new Runner();
    const order: string[] = [];

    const slowRule: Rule = {
      id: 'slow',
      run: async () => {
        order.push('slow-start');
        await new Promise(resolve => setTimeout(resolve, 50));
        order.push('slow-end');
        return [];
      },
    };

    const fastRule: Rule = {
      id: 'fast',
      run: async () => {
        order.push('fast-start');
        await new Promise(resolve => setTimeout(resolve, 10));
        order.push('fast-end');
        return [];
      },
    };

    runner.addRule(slowRule);
    runner.addRule(fastRule);
    await runner.run(createMockContext());

    // Both should start before either finishes
    expect(order[0]).toBe('slow-start');
    expect(order[1]).toBe('fast-start');
    expect(order[2]).toBe('fast-end');
    expect(order[3]).toBe('slow-end');
  });
});
