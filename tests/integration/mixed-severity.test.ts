import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');

test.describe('Mixed severity', () => {
  test('exits with code 1 when both warnings and errors are present', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'mixed-severity-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    // 1 error + 1 warning -> status 1
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('WARN');
    expect(result.stdout).toContain('ERROR');
    expect(result.stdout).toContain('Found 2 issues');
  });

  test('exits with code 0 when only warnings are present', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'mixed-severity-project');

    // Use --config to only enable line-limits (which is warn)
    const configPath = path.join(cwd, 'only-warn.json');
    const fs = require('fs');
    fs.writeFileSync(configPath, JSON.stringify({
      rules: {
        "line-limits": { "default": 2, "severity": "warn" }
      }
    }));

    try {
      const result = spawnSync('node', [cli, 'scan', '.', '--config', 'only-warn.json'], {
        cwd,
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1' },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('WARN');
      expect(result.stdout).not.toContain('ERROR');
    } finally {
      fs.unlinkSync(configPath);
    }
  });
});
