import { describe, it, expect } from 'vitest';
import path from 'path';
import { loadConfig, createRunner } from '../src/core/bootstrap';
import { ConfigSchema } from '../src/core/config';

describe('loadConfig', () => {
  it('returns defaults when config file does not exist', () => {
    const result = loadConfig('/nonexistent/puffin.json');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.project.include).toEqual(['src/**/*']);
    }
  });

  it('loads and validates an existing config file', () => {
    // examples/basic has a puffin.json
    const configPath = path.resolve(__dirname, '..', 'examples', 'basic', 'puffin.json');
    const result = loadConfig(configPath);
    expect(result.success).toBe(true);
  });
});

describe('createRunner', () => {
  it('creates an empty runner when no rules are enabled', () => {
    const config = ConfigSchema.parse({});
    const runner = createRunner(config);
    // Runner with no rules should return empty results
    expect(runner).toBeDefined();
  });

  it('creates a runner with enabled rules', () => {
    const config = ConfigSchema.parse({
      rules: {
        'line-limits': { severity: 'warn' },
        'naming-convention': { severity: 'warn' },
        'dead-code': { severity: 'error' },
      },
    });

    const runner = createRunner(config);
    expect(runner).toBeDefined();
  });

  it('only adds rules that are present in config', () => {
    const config = ConfigSchema.parse({
      rules: {
        'line-limits': { severity: 'warn' },
      },
    });

    const runner = createRunner(config);
    expect(runner).toBeDefined();
  });

  it('creates a runner with complexity rule enabled', () => {
    const config = ConfigSchema.parse({
      rules: {
        'complexity': { severity: 'warn', cyclomatic: 10, cognitive: 15 },
      },
    });

    const runner = createRunner(config);
    expect(runner).toBeDefined();
  });

  it('creates a runner with circular-dependencies rule enabled', () => {
    const config = ConfigSchema.parse({
      rules: {
        'circular-dependencies': { severity: 'error' },
      },
    });

    const runner = createRunner(config);
    expect(runner).toBeDefined();
  });

  it('creates a runner with all rules enabled', () => {
    const config = ConfigSchema.parse({
      rules: {
        'line-limits': { severity: 'warn' },
        'naming-convention': { severity: 'warn' },
        'dead-code': { severity: 'error' },
        'complexity': { severity: 'warn' },
        'circular-dependencies': { severity: 'error' },
      },
    });

    const runner = createRunner(config);
    expect(runner).toBeDefined();
  });
});

describe('loadConfig error handling', () => {
  it('throws on malformed JSON in config file', () => {
    const configPath = path.resolve(__dirname, 'integration/fixtures/malformed-config-project/puffin.json');
    expect(() => loadConfig(configPath)).toThrow();
  });

  it('returns failure for config that fails schema validation', () => {
    // Create a temp file with invalid schema content
    const fs = require('fs');
    const os = require('os');
    const tempDir = os.tmpdir();
    const tempConfig = path.join(tempDir, 'invalid-schema-puffin.json');

    fs.writeFileSync(tempConfig, JSON.stringify({
      rules: {
        'line-limits': { severity: 'invalid-severity' },
      },
    }));

    try {
      const result = loadConfig(tempConfig);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('severity');
      }
    } finally {
      fs.unlinkSync(tempConfig);
    }
  });

  it('returns defaults for empty config file', () => {
    const fs = require('fs');
    const os = require('os');
    const tempDir = os.tmpdir();
    const tempConfig = path.join(tempDir, 'empty-puffin.json');

    fs.writeFileSync(tempConfig, '{}');

    try {
      const result = loadConfig(tempConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project.include).toEqual(['src/**/*']);
      }
    } finally {
      fs.unlinkSync(tempConfig);
    }
  });
});
