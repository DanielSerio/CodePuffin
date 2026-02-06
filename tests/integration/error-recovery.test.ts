import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');

test.describe('error recovery', () => {
  test('scan continues when encountering files with syntax errors', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'error-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    const output = result.stdout + result.stderr;

    // Should complete the scan without crashing
    // TypeScript parser is lenient and creates AST even with syntax errors
    expect(output).toContain('Scan complete');
  });

  test('scan reports discovered files including ones with syntax errors', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'error-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    const output = result.stdout + result.stderr;

    // Should discover both files (valid.ts and unparseable.ts)
    expect(output).toContain('2 files');
  });

  test('scan exits with 0 when files have syntax errors but no rule violations', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'error-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    // Files with syntax errors are still scanned, rules may or may not flag them
    // Exit code depends on rule violations, not syntax errors
    expect(result.status).toBe(0);
  });
});
