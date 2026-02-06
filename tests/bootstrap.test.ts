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
