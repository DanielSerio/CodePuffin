import { test, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const root = path.resolve(__dirname, '../..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const fixtureDir = path.resolve(__dirname, 'fixtures', 'vite-advanced-project');

test.describe('Vite Plugin Advanced', () => {
  test('build fails when failOnError is true and errors are found', () => {
    const result = spawnSync('node', [viteBin, 'build'], {
      cwd: fixtureDir,
      encoding: 'utf-8',
      env: { ...process.env, NO_COLOR: '1' },
    });

    expect(result.status).toBe(1);
    expect(result.stderr + result.stdout).toContain('Architectural scan failed with errors');
  });

  test('plugin can be disabled via options', () => {
    const configPath = path.join(fixtureDir, 'vite.disabled.config.ts');
    fs.writeFileSync(configPath, `
import { defineConfig } from 'vite';
import codePuffinPlugin from '../../../../dist/plugins/vite.mjs';

export default defineConfig({
  plugins: [
    codePuffinPlugin({
      enabled: false
    })
  ]
});
    `);

    try {
      const result = spawnSync('node', [viteBin, 'build', '--config', 'vite.disabled.config.ts'], {
        cwd: fixtureDir,
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1' },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).not.toContain('CodePuffin');
    } finally {
      fs.unlinkSync(configPath);
    }
  });

  test('custom config path is respected', () => {
    const customConfigPath = path.join(fixtureDir, 'custom-puffin.json');
    fs.writeFileSync(customConfigPath, JSON.stringify({
      project: { include: ["src/**/*"] },
      rules: {
        "module-boundaries": {
          severity: "warn",
          modules: { "@features": "src/features/*" },
          rules: [{ importer: "@features", imports: "@features", allow: false }]
        }
      }
    }));

    const viteConfigPath = path.join(fixtureDir, 'vite.custom.config.ts');
    fs.writeFileSync(viteConfigPath, `
import { defineConfig } from 'vite';
import codePuffinPlugin from '../../../../dist/plugins/vite.mjs';

export default defineConfig({
  plugins: [
    codePuffinPlugin({
      configPath: 'custom-puffin.json',
      failOnError: true
    })
  ]
});
    `);

    try {
      const result = spawnSync('node', [viteBin, 'build', '--config', 'vite.custom.config.ts'], {
        cwd: fixtureDir,
        encoding: 'utf-8',
        env: { ...process.env, NO_COLOR: '1' },
      });

      // Status 0 because we changed severity to warn in the custom config
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('CodePuffin');
      expect(result.stdout).toContain('WARN module-boundaries');
    } finally {
      fs.unlinkSync(customConfigPath);
      fs.unlinkSync(viteConfigPath);
    }
  });
});
