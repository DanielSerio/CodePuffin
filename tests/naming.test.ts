import { describe, it, expect } from 'vitest';
import { checkCase, suggestName } from '../src/utils/naming';

describe('checkCase', () => {
  describe('kebab-case', () => {
    it('accepts valid kebab-case', () => {
      expect(checkCase('my-component', 'kebab-case')).toBe(true);
      expect(checkCase('button', 'kebab-case')).toBe(true);
      expect(checkCase('use-auth', 'kebab-case')).toBe(true);
      expect(checkCase('v1', 'kebab-case')).toBe(true);
    });

    it('rejects invalid kebab-case', () => {
      expect(checkCase('MyComponent', 'kebab-case')).toBe(false);
      expect(checkCase('myComponent', 'kebab-case')).toBe(false);
      expect(checkCase('my_component', 'kebab-case')).toBe(false);
      expect(checkCase('', 'kebab-case')).toBe(false);
    });
  });

  describe('camelCase', () => {
    it('accepts valid camelCase', () => {
      expect(checkCase('myComponent', 'camelCase')).toBe(true);
      expect(checkCase('button', 'camelCase')).toBe(true);
      expect(checkCase('onClick', 'camelCase')).toBe(true);
      expect(checkCase('a', 'camelCase')).toBe(true);
    });

    it('rejects invalid camelCase', () => {
      expect(checkCase('MyComponent', 'camelCase')).toBe(false);
      expect(checkCase('my-component', 'camelCase')).toBe(false);
      expect(checkCase('my_component', 'camelCase')).toBe(false);
      expect(checkCase('1abc', 'camelCase')).toBe(false);
      expect(checkCase('', 'camelCase')).toBe(false);
    });
  });

  describe('PascalCase', () => {
    it('accepts valid PascalCase', () => {
      expect(checkCase('MyComponent', 'PascalCase')).toBe(true);
      expect(checkCase('Button', 'PascalCase')).toBe(true);
      expect(checkCase('App', 'PascalCase')).toBe(true);
      expect(checkCase('A', 'PascalCase')).toBe(true);
    });

    it('rejects invalid PascalCase', () => {
      expect(checkCase('myComponent', 'PascalCase')).toBe(false);
      expect(checkCase('my-component', 'PascalCase')).toBe(false);
      expect(checkCase('1Abc', 'PascalCase')).toBe(false);
      expect(checkCase('', 'PascalCase')).toBe(false);
    });
  });

  describe('UPPER_SNAKE_CASE', () => {
    it('accepts valid UPPER_SNAKE_CASE', () => {
      expect(checkCase('MAX_VALUE', 'UPPER_SNAKE_CASE')).toBe(true);
      expect(checkCase('API', 'UPPER_SNAKE_CASE')).toBe(true);
      expect(checkCase('V1', 'UPPER_SNAKE_CASE')).toBe(true);
    });

    it('rejects invalid UPPER_SNAKE_CASE', () => {
      expect(checkCase('maxValue', 'UPPER_SNAKE_CASE')).toBe(false);
      expect(checkCase('max_value', 'UPPER_SNAKE_CASE')).toBe(false);
      expect(checkCase('', 'UPPER_SNAKE_CASE')).toBe(false);
    });
  });

  describe('useCamelCase', () => {
    it('accepts valid hook names', () => {
      expect(checkCase('useAuth', 'useCamelCase')).toBe(true);
      expect(checkCase('useState', 'useCamelCase')).toBe(true);
    });

    it('rejects names without use prefix', () => {
      expect(checkCase('auth', 'useCamelCase')).toBe(false);
      expect(checkCase('Auth', 'useCamelCase')).toBe(false);
      expect(checkCase('useauth', 'useCamelCase')).toBe(false);
      expect(checkCase('', 'useCamelCase')).toBe(false);
    });
  });

  describe('usePascalCase', () => {
    it('accepts valid hook names', () => {
      expect(checkCase('UseAuth', 'usePascalCase')).toBe(true);
      expect(checkCase('UseState', 'usePascalCase')).toBe(true);
    });

    it('rejects names without Use prefix', () => {
      expect(checkCase('auth', 'usePascalCase')).toBe(false);
      expect(checkCase('useAuth', 'usePascalCase')).toBe(false);
      expect(checkCase('', 'usePascalCase')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles numeric names based on style', () => {
      expect(checkCase('123', 'kebab-case')).toBe(true);
      expect(checkCase('123', 'camelCase')).toBe(false);
      expect(checkCase('123', 'PascalCase')).toBe(false);
      expect(checkCase('123', 'UPPER_SNAKE_CASE')).toBe(true);
    });

    it('handles single character names', () => {
      expect(checkCase('a', 'kebab-case')).toBe(true);
      expect(checkCase('a', 'camelCase')).toBe(true);
      expect(checkCase('A', 'PascalCase')).toBe(true);
      expect(checkCase('A', 'UPPER_SNAKE_CASE')).toBe(true);
    });
  });
});

describe('suggestName', () => {
  it('suggests kebab-case', () => {
    expect(suggestName('MyComponent', 'kebab-case')).toBe('my-component');
    expect(suggestName('my_component', 'kebab-case')).toBe('my-component');
    expect(suggestName('some Variable', 'kebab-case')).toBe('some-variable');
  });

  it('suggests camelCase', () => {
    expect(suggestName('my-component', 'camelCase')).toBe('myComponent');
    expect(suggestName('MyComponent', 'camelCase')).toBe('myComponent');
  });

  it('suggests PascalCase', () => {
    expect(suggestName('my-component', 'PascalCase')).toBe('MyComponent');
    expect(suggestName('useAuth', 'PascalCase')).toBe('UseAuth');
  });

  it('suggests UPPER_SNAKE_CASE', () => {
    expect(suggestName('my-component', 'UPPER_SNAKE_CASE')).toBe('MY_COMPONENT');
    expect(suggestName('myComponent', 'UPPER_SNAKE_CASE')).toBe('MY_COMPONENT');
  });

  it('suggests useCamelCase', () => {
    expect(suggestName('auth', 'useCamelCase')).toBe('useAuth');
    expect(suggestName('UseAuth', 'useCamelCase')).toBe('useAuth');
    expect(suggestName('use-auth', 'useCamelCase')).toBe('useAuth');
  });

  it('suggests usePascalCase', () => {
    expect(suggestName('auth', 'usePascalCase')).toBe('UseAuth');
    expect(suggestName('useAuth', 'usePascalCase')).toBe('UseAuth');
    expect(suggestName('use-auth', 'usePascalCase')).toBe('UseAuth');
  });
});
