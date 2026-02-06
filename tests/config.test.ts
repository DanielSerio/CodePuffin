import { describe, it, expect } from 'vitest';
import { ConfigSchema } from '../src/core/config';

describe('ConfigSchema', () => {
  it('accepts an empty object with defaults', () => {
    const result = ConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.project.include).toEqual(['src/**/*']);
      expect(result.data.project.exclude).toContain('node_modules');
      expect(result.data.output.format).toBe('stylish');
    }
  });

  it('accepts a full valid config', () => {
    const config = {
      project: {
        include: ['lib/**/*'],
        exclude: ['dist'],
      },
      modules: { ui: 'lib/ui/**/*' },
      rules: {
        'line-limits': { severity: 'error', default: 200 },
        'naming-convention': { severity: 'warn', files: 'PascalCase' },
        'dead-code': { severity: 'warn', unusedExports: false },
      },
      output: { format: 'json', reportFile: 'report.json' },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rules['line-limits']?.default).toBe(200);
      expect(result.data.rules['naming-convention']?.files).toBe('PascalCase');
      expect(result.data.rules['dead-code']?.unusedExports).toBe(false);
    }
  });

  it('rejects invalid severity values', () => {
    const config = {
      rules: {
        'line-limits': { severity: 'fatal' },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects invalid output format', () => {
    const config = {
      output: { format: 'xml' },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts naming-convention overrides with proper shape', () => {
    const config = {
      rules: {
        'naming-convention': {
          overrides: {
            '@ui': { files: 'PascalCase', classes: 'PascalCase' },
          },
        },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects naming-convention overrides with wrong types', () => {
    const config = {
      rules: {
        'naming-convention': {
          overrides: {
            '@ui': { files: 123 },
          },
        },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts complexity rule with defaults', () => {
    const config = {
      rules: {
        'complexity': {},
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rules['complexity']?.severity).toBe('warn');
      expect(result.data.rules['complexity']?.cyclomatic).toBe(10);
      expect(result.data.rules['complexity']?.cognitive).toBe(15);
    }
  });

  it('accepts complexity rule with custom thresholds', () => {
    const config = {
      rules: {
        'complexity': {
          severity: 'error',
          cyclomatic: 20,
          cognitive: 30,
        },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rules['complexity']?.cyclomatic).toBe(20);
      expect(result.data.rules['complexity']?.cognitive).toBe(30);
    }
  });

  it('accepts complexity rule with module overrides', () => {
    const config = {
      rules: {
        'complexity': {
          overrides: {
            '@utils': { cyclomatic: 5 },
            '@legacy': { cyclomatic: 25, cognitive: 40 },
          },
        },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects complexity rule with invalid severity', () => {
    const config = {
      rules: {
        'complexity': { severity: 'fatal' },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('accepts circular-dependencies rule with defaults', () => {
    const config = {
      rules: {
        'circular-dependencies': {},
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rules['circular-dependencies']?.severity).toBe('error');
    }
  });

  it('accepts circular-dependencies rule with warn severity', () => {
    const config = {
      rules: {
        'circular-dependencies': { severity: 'warn' },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rules['circular-dependencies']?.severity).toBe('warn');
    }
  });
});
