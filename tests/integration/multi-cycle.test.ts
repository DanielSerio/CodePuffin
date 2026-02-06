import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');

test.describe('Multiple independent cycles', () => {
  test('detects and reports all independent cycles', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'multi-cycle-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.status).toBe(1);

    // Should find 3 distinct cycles
    // 1. a-b
    // 2. c-d-e
    // 3. f (self)
    expect(result.stdout).toContain('Found 3 issues');
    expect(result.stdout).toContain('a.ts');
    expect(result.stdout).toContain('c.ts');
    expect(result.stdout).toContain('f.ts');
  });
});
