import { describe, it, expect } from 'vitest';
import { createRunner } from '../src/core/bootstrap';
import { ConfigSchema } from '../src/core/config';

describe('createRunner', () => {
  it('creates an empty runner when no rules are enabled', () => {
    const config = ConfigSchema.parse({});
    const runner = createRunner(config);
    expect(runner).toBeDefined();
  });

  it('creates a runner with enabled rules', () => {
    const config = ConfigSchema.parse({
      rules: {
        'circular-dependencies': { severity: 'error' },
        'module-boundaries': {
          severity: 'error',
          modules: { '@features': 'src/features/*' },
          rules: [{ importer: '@features', imports: '@features', allow: false }],
        },
        'layer-violations': {
          severity: 'warn',
          layers: [{ name: 'ui', pattern: 'src/ui/**' }],
          allowed: [{ importer: 'ui', imports: ['services'] }],
        },
        'public-api-only': {
          severity: 'warn',
          modules: ['src/features/*'],
        },
      },
    });

    const runner = createRunner(config);
    expect(runner).toBeDefined();
  });
});
