import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const fixtureDir = path.resolve(__dirname, 'fixtures', 'next-project');

test('next.js plugin reports scan results when enabled', () => {
  const result = spawnSync('node', ['run-plugin.cjs'], {
    cwd: fixtureDir,
    encoding: 'utf-8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  const output = result.stdout + result.stderr;

  expect(result.status).toBe(0);

  // Plugin should print scan results header
  expect(output).toContain('CodePuffin');

  // Circular dependency violations should be reported
  expect(output).toContain('circular-dependencies');
});
