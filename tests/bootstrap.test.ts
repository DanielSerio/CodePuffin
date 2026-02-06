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
