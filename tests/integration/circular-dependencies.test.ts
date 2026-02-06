import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');
const fixtureDir = path.resolve(__dirname, 'fixtures', 'circular-project');

test('detects circular dependencies between files', () => {
  const result = spawnSync('node', [cli, 'scan', '.'], {
    cwd: fixtureDir,
    encoding: 'utf-8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  const output = result.stdout + result.stderr;

  // Should report circular dependency
  expect(output).toContain('circular-dependencies');
  expect(output).toContain('Circular dependency detected');

  // The cycle chain should mention both files
  expect(output).toContain('a.ts');
  expect(output).toContain('b.ts');
});

test('exits with code 1 for circular dependencies with error severity', () => {
  const result = spawnSync('node', [cli, 'scan', '.'], {
    cwd: fixtureDir,
    encoding: 'utf-8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  expect(result.status).toBe(1);
});
