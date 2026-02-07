import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');

test.describe('Platform compatibility', () => {
  const cwd = path.resolve(__dirname, 'fixtures', 'platform-project');

  test.beforeAll(() => {
    if (!fs.existsSync(cwd)) {
      fs.mkdirSync(cwd, { recursive: true });
    }
    const puffinPath = path.join(cwd, 'puffin.json');
    fs.writeFileSync(puffinPath, JSON.stringify({
      rules: {
        "circular-dependencies": { "severity": "warn" }
      }
    }));
  });

  test('handles Windows-style backslashes in config (if provided)', () => {
    const configPath = path.join(cwd, 'backslash-config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      project: {
        include: ["src\\**\\*.ts"]
      },
      rules: {
        "circular-dependencies": { "severity": "warn" }
      }
    }));

    const result = spawnSync('node', [cli, 'scan', '.', '--config', 'backslash-config.json'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    try {
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Scan complete');
      // It should find the deep file even if include used backslashes
      expect(result.stdout).toContain('Discovered 1 files');
    } finally {
      fs.unlinkSync(configPath);
    }
  });

  test('handles very long paths (> 260 chars)', () => {
    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    // Should successfully discover and scan the deep file
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Discovered 1 files');
    expect(result.stdout).toContain('Scan complete');
  });

  test('is case-insensitive for file extensions by default', () => {
    const upperFile = path.join(cwd, 'SRC', 'UPPER.TS');
    if (!fs.existsSync(path.dirname(upperFile))) {
      fs.mkdirSync(path.dirname(upperFile), { recursive: true });
    }
    fs.writeFileSync(upperFile, 'export const x = 1;');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    try {
      expect(result.status).toBe(0);
      // Should find both deep.ts and UPPER.TS
      expect(result.stdout).toContain('Discovered 2 files');
    } finally {
      fs.unlinkSync(upperFile);
    }
  });

  test('is case-insensitive for directories in config include pattern', () => {
    const configPath = path.join(cwd, 'case-config.json');
    fs.writeFileSync(configPath, JSON.stringify({
      project: {
        include: ["SRC/**/*.ts"]
      },
      rules: {
        "circular-dependencies": { "severity": "warn" }
      }
    }));

    const result = spawnSync('node', [cli, 'scan', '.', '--config', 'case-config.json'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    try {
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Scan complete');
      // Discovered 1 files (deep.ts) because SRC/ matches src/ on Windows
      expect(result.stdout).toContain('Discovered 1 files');
    } finally {
      fs.unlinkSync(configPath);
    }
  });
});
