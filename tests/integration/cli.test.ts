import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');

test('reports violations and exits with code 1 for a project with errors', () => {
  const cwd = path.resolve(root, 'examples', 'basic');

  const result = spawnSync('node', [cli, 'scan', '.'], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  const output = result.stdout + result.stderr;

  expect(result.status).toBe(1);

  // All three rules should report issues
  expect(output).toContain('naming-convention');
  expect(output).toContain('line-limits');
  expect(output).toContain('dead-code');

  // The violating file should appear in the output
  expect(output).toContain('BadCode.ts');

  // Should indicate scan failure
  expect(output).toContain('Scan failed');
});

test('exits with code 0 for a clean project', () => {
  const cwd = path.resolve(__dirname, 'fixtures', 'clean-project');

  const result = spawnSync('node', [cli, 'scan', '.'], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('Scan complete');
});
