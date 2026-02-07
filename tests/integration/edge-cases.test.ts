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
    // Files should be discovered
    expect(result.stdout).toContain('Discovered 2 files');
    expect(result.stdout).toContain('Scan complete');
  });
});
