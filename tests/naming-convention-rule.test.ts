import { describe, it, expect, vi } from 'vitest';
import { NamingConventionRule } from '../src/rules/naming-convention';
import { ScanContext } from '../src/core/scanner';
import { ConfigSchema } from '../src/core/config';
import * as fs from 'fs';

vi.mock('fs');

describe('NamingConventionRule', () => {
  const rule = new NamingConventionRule();

  it('enforces component filename style', async () => {
    const config = ConfigSchema.parse({
      rules: {
        'naming-convention': {
          files: 'kebab-case',
          components: {
            filename: 'PascalCase'
          }
        }
      }
    });

    const context: ScanContext = {
      root: '/project',
      files: ['/project/src/MyComponent.tsx', '/project/src/other-file.ts', '/project/src/bad-component.tsx'],
      config,
      modules: {}
    };

    vi.mocked(fs.readFileSync).mockReturnValue('');

    const results = await rule.run(context);

    // MyComponent.tsx -> Valid
    // other-file.ts -> Valid (kebab-case)
    // bad-component.tsx -> Invalid (should be PascalCase)

    const errors = results.filter(r => r.file.endsWith('.tsx'));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('File name "bad-component" should be in PascalCase');
  });

  it('enforces component entity naming based on JSX detection', async () => {
    const config = ConfigSchema.parse({
      rules: {
        'naming-convention': {
          variables: 'camelCase',
          components: {
            entity: 'PascalCase',
            filename: 'PascalCase'
          }
        }
      }
    });

    const code = `
       export const myComponent = () => <div>Hello</div>; // Invalid component name (returns JSX)
       export const SomeComponent = () => <div>Hi</div>; // Valid component name
       export const someVar = 1; // Valid variable name
     `;

    const context: ScanContext = {
      root: '/project',
      files: ['/project/src/MyComponent.tsx'],
      config,
      modules: {}
    };

    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (path === '/project/src/MyComponent.tsx') return code;
      return '';
    });

    const results = await rule.run(context);

    // myComponent should be flagged as Component because it returns JSX
    // someVar should NOT be flagged (camelCase is fine)
    // MyComponent.tsx is valid because it matches PascalCase

    const componentErrors = results.filter(r => r.message.includes('Component'));
    expect(componentErrors).toHaveLength(1);
    expect(componentErrors[0].message).toContain('Component "myComponent" should be in PascalCase');

    expect(results).toHaveLength(1);
  });

  it('enforces component entity naming for function declarations', async () => {
    const config = ConfigSchema.parse({
      rules: {
        'naming-convention': {
          functions: 'camelCase',
          components: {
            entity: 'PascalCase',
            filename: 'PascalCase'
          }
        }
      }
    });

    const code = `
      function myComponent() { return <div />; } // Invalid
      function someUtility() { return 1; } // Valid
    `;

    const context: ScanContext = {
      root: '/project',
      files: ['/project/src/MyComponent.tsx'],
      config,
      modules: {}
    };

    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (path === '/project/src/MyComponent.tsx') return code;
      return '';
    });

    const results = await rule.run(context);
    const componentErrors = results.filter(r => r.message.includes('Component'));
    expect(componentErrors).toHaveLength(1);
    expect(componentErrors[0].message).toContain('Component "myComponent" should be in PascalCase');
    expect(results).toHaveLength(1);
  });
});
