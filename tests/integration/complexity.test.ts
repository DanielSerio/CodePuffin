import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');
const fixtureDir = path.resolve(__dirname, 'fixtures', 'complexity-project');

test('reports complexity violations for complex functions', () => {
  const result = spawnSync('node', [cli, 'scan', '.'], {
    cwd: fixtureDir,
    encoding: 'utf-8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  const output = result.stdout + result.stderr;

  // Should report complexity violations
  expect(output).toContain('complexity');
  expect(output).toContain('complexFunction');

  // Should NOT report on simpleFunction
  expect(output).not.toContain('simpleFunction');
});

test('exits 0 when complexity rule uses warn severity', () => {
  const result = spawnSync('node', [cli, 'scan', '.'], {
    cwd: fixtureDir,
    encoding: 'utf-8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  // warn severity should not cause exit code 1
  expect(result.status).toBe(0);
});
