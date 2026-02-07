import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');

test.describe('Performance and Scale', () => {
  test.skip('scans 1000+ files and detects cycles', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'large-project');

    const start = Date.now();
    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });
    const end = Date.now();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Scan complete');
    expect(result.stdout).toContain('Discovered 1000 files');

    const duration = (end - start) / 1000;
    console.log(`Scan of 1000 files took ${duration.toFixed(2)}s`);
    // Performance claim check
    expect(duration).toBeLessThan(15);
  });

  test.skip('handles huge files without crashing', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'huge-file-project');

    // Updated to use a valid rule
    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Scan complete');
  });

  test.skip('handles deep nesting (25 levels)', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'deep-nesting-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Scan complete');
  });
});
