import { describe, it, expect } from 'vitest';
import { reportJson, reportMarkdown } from '../src/core/reporter';
import { RuleResult } from '../src/core/rules';

const root = '/project';

function makeResult(overrides: Partial<RuleResult> = {}): RuleResult {
  return {
    ruleId: 'test-rule',
    file: '/project/src/file.ts',
    message: 'Something is wrong',
    severity: 'error',
    ...overrides,
  };
}

describe('reportJson', () => {
  it('returns valid JSON with summary and results', () => {
    const results: RuleResult[] = [
      makeResult({ severity: 'error' }),
      makeResult({ severity: 'warn', file: '/project/src/other.ts', message: 'A warning' }),
    ];

    const output = reportJson(results, root);
    const parsed = JSON.parse(output);

    expect(parsed.summary).toEqual({ total: 2, errors: 1, warnings: 1 });
    expect(parsed.results).toHaveLength(2);
  });

  it('uses relative file paths with forward slashes', () => {
    const results: RuleResult[] = [makeResult()];

    const output = reportJson(results, root);
    const parsed = JSON.parse(output);

    expect(parsed.results[0].file).toBe('src/file.ts');
  });

  it('includes line when defined', () => {
    const results: RuleResult[] = [makeResult({ line: 42 })];

    const output = reportJson(results, root);
    const parsed = JSON.parse(output);

    expect(parsed.results[0].line).toBe(42);
  });

  it('omits line when undefined', () => {
    const results: RuleResult[] = [makeResult()];

    const output = reportJson(results, root);
    const parsed = JSON.parse(output);

    expect(parsed.results[0]).not.toHaveProperty('line');
  });

  it('handles empty results', () => {
    const output = reportJson([], root);
    const parsed = JSON.parse(output);

    expect(parsed.summary).toEqual({ total: 0, errors: 0, warnings: 0 });
    expect(parsed.results).toEqual([]);
  });
});

describe('reportMarkdown', () => {
  it('includes header and summary line', () => {
    const results: RuleResult[] = [
      makeResult({ severity: 'error' }),
      makeResult({ severity: 'warn', message: 'A warning' }),
    ];

    const output = reportMarkdown(results, root);

    expect(output).toContain('# CodePuffin Scan Report');
    expect(output).toContain('**Total issues:** 2');
    expect(output).toContain('**Errors:** 1');
    expect(output).toContain('**Warnings:** 1');
  });

  it('groups results by file', () => {
    const results: RuleResult[] = [
      makeResult({ file: '/project/src/a.ts', message: 'Issue A' }),
      makeResult({ file: '/project/src/b.ts', message: 'Issue B' }),
    ];

    const output = reportMarkdown(results, root);

    expect(output).toContain('## src/a.ts');
    expect(output).toContain('## src/b.ts');
  });

  it('renders table rows with line numbers', () => {
    const results: RuleResult[] = [makeResult({ line: 10, severity: 'error' })];

    const output = reportMarkdown(results, root);

    expect(output).toContain('| 10 | ERROR | test-rule | Something is wrong |');
  });

  it('renders dash for missing line numbers', () => {
    const results: RuleResult[] = [makeResult()];

    const output = reportMarkdown(results, root);

    expect(output).toContain('| - | ERROR | test-rule | Something is wrong |');
  });

  it('handles empty results', () => {
    const output = reportMarkdown([], root);

    expect(output).toContain('**Total issues:** 0');
    expect(output).not.toContain('##');
  });
});
