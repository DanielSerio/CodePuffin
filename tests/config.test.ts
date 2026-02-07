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

  it('accepts a full valid config with architectural rules', () => {
    const config = {
      project: {
        include: ['lib/**/*'],
        exclude: ['dist'],
      },
      modules: { ui: 'lib/ui/**/*' },
      rules: {
        'circular-dependencies': { severity: 'error' },
        'module-boundaries': {
          severity: 'error',
          modules: { '@features': 'src/features/*' },
          rules: [{ from: '@features', to: '@features', allow: false }],
        },
      },
      output: { format: 'json', reportFile: 'report.json' },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rules['circular-dependencies']?.severity).toBe('error');
      expect(result.data.rules['module-boundaries']?.severity).toBe('error');
    }
  });

  it('rejects invalid severity values', () => {
    const config = {
      rules: {
        'circular-dependencies': { severity: 'fatal' },
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

  it('accepts module-boundaries rule with full config', () => {
    const config = {
      rules: {
        'module-boundaries': {
          severity: 'error',
          modules: {
            '@features': 'src/features/*',
            '@shared': 'src/shared/*',
          },
          rules: [
            { from: '@features', to: '@features', allow: false, message: 'No cross-feature imports' },
            { from: '@features', to: '@shared', allow: true },
          ],
        },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('accepts layer-violations rule with full config', () => {
    const config = {
      rules: {
        'layer-violations': {
          severity: 'error',
          layers: [
            { name: 'ui', pattern: 'src/ui/**' },
            { name: 'services', pattern: 'src/services/**' },
            { name: 'data', pattern: 'src/data/**' },
          ],
          allowed: [
            { from: 'ui', to: ['services'] },
            { from: 'services', to: ['data'] },
          ],
        },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('accepts public-api-only rule with config', () => {
    const config = {
      rules: {
        'public-api-only': {
          severity: 'warn',
          modules: ['src/features/*', 'src/shared/*'],
          exceptions: ['*.test.ts', '*.spec.ts'],
        },
      },
    };

    const result = ConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
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
