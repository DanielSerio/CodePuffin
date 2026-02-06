import { describe, it, expect } from 'vitest';
import { checkCase } from '../src/utils/naming';

describe('checkCase', () => {
  describe('kebab-case', () => {
    it('accepts valid kebab-case', () => {
      expect(checkCase('my-component', 'kebab-case')).toBe(true);
      expect(checkCase('button', 'kebab-case')).toBe(true);
      expect(checkCase('use-auth', 'kebab-case')).toBe(true);
    });

    it('rejects invalid kebab-case', () => {
      expect(checkCase('MyComponent', 'kebab-case')).toBe(false);
      expect(checkCase('myComponent', 'kebab-case')).toBe(false);
      expect(checkCase('my_component', 'kebab-case')).toBe(false);
    });
  });

  describe('camelCase', () => {
    it('accepts valid camelCase', () => {
      expect(checkCase('myComponent', 'camelCase')).toBe(true);
      expect(checkCase('button', 'camelCase')).toBe(true);
      expect(checkCase('onClick', 'camelCase')).toBe(true);
    });

    it('rejects invalid camelCase', () => {
      expect(checkCase('MyComponent', 'camelCase')).toBe(false);
      expect(checkCase('my-component', 'camelCase')).toBe(false);
      expect(checkCase('my_component', 'camelCase')).toBe(false);
    });
  });

  describe('PascalCase', () => {
    it('accepts valid PascalCase', () => {
      expect(checkCase('MyComponent', 'PascalCase')).toBe(true);
      expect(checkCase('Button', 'PascalCase')).toBe(true);
      expect(checkCase('App', 'PascalCase')).toBe(true);
    });

    it('rejects invalid PascalCase', () => {
      expect(checkCase('myComponent', 'PascalCase')).toBe(false);
      expect(checkCase('my-component', 'PascalCase')).toBe(false);
    });
  });

  describe('UPPER_SNAKE_CASE', () => {
    it('accepts valid UPPER_SNAKE_CASE', () => {
      expect(checkCase('MAX_VALUE', 'UPPER_SNAKE_CASE')).toBe(true);
      expect(checkCase('API', 'UPPER_SNAKE_CASE')).toBe(true);
    });

    it('rejects invalid UPPER_SNAKE_CASE', () => {
      expect(checkCase('maxValue', 'UPPER_SNAKE_CASE')).toBe(false);
      expect(checkCase('max_value', 'UPPER_SNAKE_CASE')).toBe(false);
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
    });
  });
});
