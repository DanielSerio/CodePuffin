import { describe, it, expect, vi } from 'vitest';
import { reportJson, reportMarkdown, reportStylish } from '../src/core/reporter';
import { RuleResult } from '../src/core/rules';
import { ScanContext } from '../src/core/scanner';

const root = '/project';

// Simple mock context for tests
const mockContext: ScanContext = {
  root,
  config: {
    project: {
      include: ['src/**/*'],
      exclude: ['node_modules'],
      aliases: {}
    },
    rules: {},
    output: { format: 'stylish' }
  },
  files: ['/project/src/file.ts', '/project/src/other.ts'],
  modules: {}
};

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
  it('includes header and summary section', () => {
    const results: RuleResult[] = [
      makeResult({ severity: 'error' }),
      makeResult({ severity: 'warn', message: 'A warning' }),
    ];

    const output = reportMarkdown(results, mockContext);

    expect(output).toContain('# 🐧 CodePuffin Scan Report');
    expect(output).toContain('### 📊 Summary');
    expect(output).toContain('**Total Issues**: 2');
    expect(output).toContain('**Errors**: 1');
    expect(output).toContain('**Warnings**: 1');
  });

  it('includes agent mission section', () => {
    const results: RuleResult[] = [makeResult()];

    const output = reportMarkdown(results, mockContext);

    expect(output).toContain('## 🤖 Agent Mission');
    expect(output).toContain('AI developer');
  });

  it('renders issues in a table format', () => {
    const results: RuleResult[] = [
      makeResult({ file: '/project/src/a.ts', message: 'Issue A' }),
      makeResult({ file: '/project/src/b.ts', message: 'Issue B' }),
    ];

    const output = reportMarkdown(results, mockContext);

    expect(output).toContain('| File Path | Line | Severity |');
    expect(output).toContain('`src/a.ts`');
    expect(output).toContain('`src/b.ts`');
  });

  it('renders table rows with line numbers using [L#] format', () => {
    const results: RuleResult[] = [makeResult({ line: 10, severity: 'error' })];

    const output = reportMarkdown(results, mockContext);

    expect(output).toContain('[L10]');
    expect(output).toContain('🔴 **ERROR**');
  });

  it('renders dash for missing line numbers', () => {
    const results: RuleResult[] = [makeResult()];

    const output = reportMarkdown(results, mockContext);

    // Line column shows - for missing line numbers
    expect(output).toContain('| `src/file.ts` | - |');
    expect(output).toContain('🔴 **ERROR**');
  });

  it('handles empty results with success message', () => {
    const output = reportMarkdown([], mockContext);

    expect(output).toContain('**Total Issues**: 0');
    expect(output).toContain('Great job! No issues found.');
  });

  it('escapes pipe characters in markdown tables', () => {
    const results: RuleResult[] = [
      makeResult({
        message: 'Message | with pipe',
        suggestion: 'Suggestion | with pipe',
        ruleId: 'rule|pipe'
      })
    ];

    const output = reportMarkdown(results, mockContext);

    // Should contain escaped pipes \|
    expect(output).toContain('Message \\| with pipe');
    expect(output).toContain('Suggestion \\| with pipe');
    expect(output).toContain('rule\\|pipe');
  });
});

describe('reportStylish', () => {
  it('logs success message for empty results', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    reportStylish([], root);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No issues found'));
    logSpy.mockRestore();
  });

  it('logs grouped issues with colors', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
    const results: RuleResult[] = [
      makeResult({ file: '/project/src/a.ts', message: 'Error A', severity: 'error' }),
      makeResult({ file: '/project/src/a.ts', message: 'Warn A', severity: 'warn' }),
    ];

    reportStylish(results, root);

    const calls = logSpy.mock.calls.map(args => args[0]);
    expect(calls.some(c => c.includes('a.ts'))).toBe(true);
    expect(calls.some(c => c.includes('ERROR') && c.includes('Error A'))).toBe(true);
    expect(calls.some(c => c.includes('WARN') && c.includes('Warn A'))).toBe(true);

    logSpy.mockRestore();
  });
});
