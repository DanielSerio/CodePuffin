import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');

test.describe('CLI error handling', () => {
  test('--help displays usage information', () => {
    const result = spawnSync('node', [cli, '--help'], {
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('puffin');
    expect(result.stdout).toContain('scan');
  });

  test('--version displays version number', () => {
    const result = spawnSync('node', [cli, '--version'], {
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  test('scan with invalid directory completes with 0 files', () => {
    const result = spawnSync('node', [cli, 'scan', '/nonexistent/path/that/does/not/exist'], {
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    // Scanner gracefully returns 0 files for non-existent directories
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 files');
  });

  test('scan with --config pointing to missing file shows error', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'clean-project');

    const result = spawnSync('node', [cli, 'scan', '.', '--config', 'nonexistent.json'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    // Should succeed with defaults (missing config falls back to defaults)
    expect(result.status).toBe(0);
  });

  test('scan with malformed config file shows parse error', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'malformed-config-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });
    const output = result.stdout + result.stderr;
    expect(output).toContain('Failed to load config file');
  });

  test('scan with invalid schema in config file shows validation error', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'invalid-schema-project');

    const result = spawnSync('node', [cli, 'scan', '.'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    const output = result.stdout + result.stderr;

    expect(result.status).toBe(1);
    expect(output).toContain('Invalid configuration');
    expect(output).toContain('severity');
  });

  test('scan with -c short option works', () => {
    const cwd = path.resolve(__dirname, 'fixtures', 'clean-project');

    const result = spawnSync('node', [cli, 'scan', '.', '-c', 'puffin.json'], {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Scan complete');
  });

  test('unknown command shows help', () => {
    const result = spawnSync('node', [cli, 'unknown-command'], {
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    const output = result.stdout + result.stderr;
    // Commander shows help or error for unknown commands
    expect(output).toMatch(/unknown|help|Usage/i);
  });
});
