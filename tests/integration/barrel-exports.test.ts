import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');

test.describe('Barrel exports', () => {
  test('detects circular dependencies through index files', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'barrel-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Circular dependency detected');
    // The cycle involves several files including index.ts
    expect(result.stdout).toContain('index.ts');
  });
});
