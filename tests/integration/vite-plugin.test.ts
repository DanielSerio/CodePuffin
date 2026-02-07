import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const fixtureDir = path.resolve(__dirname, 'fixtures', 'vite-project');

test('vite build reports codepuffin scan results as warnings', () => {
  const result = spawnSync('node', [viteBin, 'build'], {
    cwd: fixtureDir,
    encoding: 'utf-8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  const output = result.stdout + result.stderr;

  // Plugin should print scan results header
  expect(output).toContain('CodePuffin');

  // Circular dependency violations should be reported
  expect(output).toContain('circular-dependencies');

  // Build should complete successfully (warnings don't fail the build)
  expect(result.status).toBe(0);
});
