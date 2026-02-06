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

  // Error handling tests
  describe('error handling', () => {
    it('rejects config with wrong type for project.include', () => {
      const config = {
        project: {
          include: 'src/**/*', // should be array
        },
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects config with wrong type for project.exclude', () => {
      const config = {
        project: {
          exclude: 'node_modules', // should be array
        },
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('accepts any string for naming-convention case styles (validated at runtime)', () => {
      const config = {
        rules: {
          'naming-convention': {
            files: 'custom-style',
          },
        },
      };

      // Schema accepts any string; actual style validation happens at runtime
      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('accepts any number for line limit (no min/max constraint in schema)', () => {
      const config = {
        rules: {
          'line-limits': {
            default: -10,
          },
        },
      };

      // Schema accepts any number
      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('accepts float for complexity threshold', () => {
      const config = {
        rules: {
          complexity: {
            cyclomatic: 10.5,
          },
        },
      };

      // Schema uses z.number() which accepts floats
      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('rejects string where number is expected', () => {
      const config = {
        rules: {
          'line-limits': {
            default: 'one hundred',
          },
        },
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('rejects config with null rules object', () => {
      const config = {
        rules: null,
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('accepts config with extra unknown properties (passthrough)', () => {
      const config = {
        unknownProperty: 'value',
        rules: {},
      };

      const result = ConfigSchema.safeParse(config);
      // Zod strict mode would fail, but default should pass or strip
      expect(result.success).toBe(true);
    });
  });
});
