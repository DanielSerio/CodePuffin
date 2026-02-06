import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');

test.describe('Module overrides', () => {
  test('applies module-specific overrides for line-limits', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'module-overrides-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.status).toBe(0);

    // helper.ts (4 lines) exceeds @utils limit (2) -> Warning
    expect(result.stdout).toContain('helper.ts');
    expect(result.stdout).toContain('line limit of 2');

    // main.ts (5 lines) does NOT exceed default limit (10) -> No warning
    expect(result.stdout).not.toContain('main.ts');
  });

  test('respects order of overrides for overlapping modules', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'module-overrides-project');

    // Create a temporary config with overlapping modules
    const configPath = path.join(cwd, 'overlapping.json');
    const fs = require('fs');
    fs.writeFileSync(configPath, JSON.stringify({
      modules: {
        "m1": "src/**/*",
        "m2": "src/utils/**/*"
      },
      rules: {
        "line-limits": {
          "default": 10,
          "overrides": {
            "@m1": 5,
            "@m2": 2
          }
        }
      }
    }));

    const result = spawnSync('node', [cli, 'scan', '.', '--config', 'overlapping.json'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    try {
      expect(result.status).toBe(0);
      // helper.ts is in both m1 and m2. m1 comes first in overrides.
      // So limit should be 5. helper.ts has 4 lines -> No warning.
      expect(result.stdout).not.toContain('helper.ts');
    } finally {
      fs.unlinkSync(configPath);
    }
  });
});
