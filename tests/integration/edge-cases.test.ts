import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');

test.describe('Edge case file handling', () => {
  test('handles files with unicode names and spaces', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'unicode-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('🚀-puffin.ts');
    expect(result.stdout).toContain('file with spaces.ts');
    expect(result.stdout).toContain('Scan complete');
  });

  test('reports violations in files with special characters', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'unicode-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    // Both files have 2 lines, limit is 1. Should have 2 warnings.
    expect(result.stdout).toContain('2 issues');
  });
});
