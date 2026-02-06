import { describe, it, expect, vi } from 'vitest';
import ts from 'typescript';
import { NoAnyRule } from '../src/rules/no-any';
import { ScanContext } from '../src/core/scanner';
import * as fs from 'fs';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

describe('NoAnyRule', () => {
  const rule = new NoAnyRule();

  it('detects any in variable declarations', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue("const x: any = 1;");
    const context = {
      files: ['test.ts'],
      config: { rules: { 'no-any': { severity: 'error' } } }
    } as unknown as ScanContext;

    const results = await rule.run(context);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('forbidden');
    expect(results[0].line).toBe(1);
  });

  it('detects any in function parameters', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue("function foo(arg: any) {}");
    const context = {
      files: ['test.ts'],
      config: { rules: { 'no-any': { severity: 'error' } } }
    } as unknown as ScanContext;

    const results = await rule.run(context);
    expect(results).toHaveLength(1);
  });

  it('detects any in return types', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue("function foo(): any { return 1; }");
    const context = {
      files: ['test.ts'],
      config: { rules: { 'no-any': { severity: 'error' } } }
    } as unknown as ScanContext;

    const results = await rule.run(context);
    expect(results).toHaveLength(1);
  });
});
