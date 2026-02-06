import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');

test.describe('Advanced dead code detection', () => {
  test('detects unused types, interfaces, and enums', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'dead-code-advanced-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.status).toBe(1);

    // UserID is unused (it is used in user.ts but not exported and used elsewhere)
    // Wait, UserID is exported from user.ts, then re-exported from index.ts.
    // main.ts imports User and UserRole, but not UserID.
    // So UserID should be marked as unused.
    expect(result.stdout).toContain('Export "UserID" is never imported');
    expect(result.stdout).toContain('Export "unusedValue" is never imported');
  });
});
