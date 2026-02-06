import { describe, it, expect, vi } from 'vitest';
import ts from 'typescript';
import { NoEnumRule } from '../src/rules/no-enum';
import { ScanContext } from '../src/core/scanner';
import * as fs from 'fs';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

describe('NoEnumRule', () => {
  const rule = new NoEnumRule();

  it('detects enum declarations', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue("enum Direction { Up, Down }");
    const context = {
      files: ['test.ts'],
      config: { rules: { 'no-enum': { severity: 'error' } } }
    } as unknown as ScanContext;

    const results = await rule.run(context);
    expect(results).toHaveLength(1);
    expect(results[0].message).toContain('forbidden');
  });

  it('detects const enums', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue("const enum Direction { Up, Down }");
    const context = {
      files: ['test.ts'],
      config: { rules: { 'no-enum': { severity: 'error' } } }
    } as unknown as ScanContext;

    const results = await rule.run(context);
    expect(results).toHaveLength(1);
  });
});
