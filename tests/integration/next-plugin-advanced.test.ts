import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const fixtureDir = path.resolve(__dirname, 'fixtures', 'next-advanced-project');

test.describe('Next.js Plugin Advanced', () => {
  test('plugin throws error when failOnError is true and violations found', () => {
    // Force NODE_ENV to development to enable plugin by default logic, 
    // although we are passing explicit options in the script.
    const result = spawnSync('node', ['run-fail.cjs'], {
      cwd: fixtureDir,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1', NODE_ENV: 'development' },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Architectural scan failed with errors');
    expect(result.stdout).toContain('ERROR');
    expect(result.stdout).toContain('module-boundaries');
  });

  test('plugin respects enabled: false option', () => {
    const result = spawnSync('node', ['run-disabled.cjs'], {
      cwd: fixtureDir,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1', NODE_ENV: 'development' },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Plugin finished successfully (disabled)');
    expect(result.stdout).not.toContain('CodePuffin architectural scan results');
  });

  test('plugin is disabled by default in non-dev/non-CI environment', () => {
    // Create a script that doesn't explicitly enable/disable
    const fs = require('fs');
    const scriptPath = path.join(fixtureDir, 'run-default.cjs');
    fs.writeFileSync(scriptPath, `
const withCodePuffin = require('../../../../dist/plugins/next.js').default;
const config = withCodePuffin({});
(async () => {
  await config.rewrites();
})();
    `);

    try {
      const result = spawnSync('node', ['run-default.cjs'], {
        cwd: fixtureDir,
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1', NODE_ENV: 'production', CI: 'false' },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).not.toContain('CodePuffin');
    } finally {
      fs.unlinkSync(scriptPath);
    }
  });
});
