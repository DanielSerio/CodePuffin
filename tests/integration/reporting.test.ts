import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import { readdirSync, readFileSync, rmSync } from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist', 'index.js');
const fixtureDir = path.resolve(__dirname, 'fixtures', 'report-project');
const reportsDir = path.join(fixtureDir, 'reports');

// Clean up generated reports before and after tests
function cleanReports() {
  try {
    rmSync(reportsDir, { recursive: true, force: true });
  } catch {
    // directory may not exist
  }
}

test.beforeEach(() => cleanReports());
test.afterAll(() => cleanReports());

test('writes a JSON report file with timestamp in filename', () => {
  const result = spawnSync('node', [cli, 'scan', '.'], {
    cwd: fixtureDir,
    encoding: 'utf-8',
    env: { ...process.env, NO_COLOR: '1' },
  });

  const output = result.stdout + result.stderr;

  // Should confirm report was written
  expect(output).toContain('Report written to');

  // Reports directory should exist with one file
  const files = readdirSync(reportsDir);
  expect(files.length).toBe(1);
  expect(files[0]).toMatch(/^scan-.*\.json$/);

  // File should be valid JSON with correct structure
  const reportContent = readFileSync(path.join(reportsDir, files[0]), 'utf-8');
  const report = JSON.parse(reportContent);

  expect(report.summary).toBeDefined();
  expect(report.summary.total).toBeGreaterThan(0);
  expect(report.results).toBeInstanceOf(Array);
  expect(report.results.length).toBeGreaterThan(0);

  // Results should have the expected structure
  const firstResult = report.results[0];
  expect(firstResult.ruleId).toBeDefined();
  expect(firstResult.file).toBeDefined();
  expect(firstResult.message).toBeDefined();
  expect(firstResult.severity).toBeDefined();

  // File paths should be relative (no leading slash)
  expect(firstResult.file).not.toMatch(/^\//);
});

test('writes a Markdown report with a stable filename (no timestamp)', () => {
  // Markdown reports should overwrite the same file every time, ignoring [timestamp]
  const mdFixtureDir = fixtureDir;
  const mdConfigPath = path.join(mdFixtureDir, 'puffin-md.json');
  const { writeFileSync } = require('fs');
  writeFileSync(mdConfigPath, JSON.stringify({
    project: { include: ['src/**/*'] },
    rules: { 'circular-dependencies': { severity: 'warn' } },
    output: { format: 'markdown', reportFile: 'reports/scan-[timestamp].md' },
  }));

  try {
    const result = spawnSync('node', [cli, 'scan', '.', '-c', 'puffin-md.json'], {
      cwd: mdFixtureDir,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    const output = result.stdout + result.stderr;
    expect(output).toContain('Report written to');

    // Filename should still contain the literal [timestamp] placeholder, not a resolved timestamp
    const files = readdirSync(reportsDir);
    expect(files).toContain('scan-[timestamp].md');

    const reportContent = readFileSync(path.join(reportsDir, 'scan-[timestamp].md'), 'utf-8');
    expect(reportContent).toContain('# 🐧 CodePuffin Scan Report');
    expect(reportContent).toContain('**Total Issues**:');
    expect(reportContent).toContain('circular-dependencies');
  } finally {
    // Clean up temp config
    try { rmSync(mdConfigPath); } catch { /* ignore */ }
  }
});
