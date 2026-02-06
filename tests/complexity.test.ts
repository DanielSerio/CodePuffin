import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { calculateCyclomatic, calculateCognitive } from '../src/rules/complexity';

// Helper: parse inline TS and find the first function body
function parseFunctionBody(code: string) {
  const source = ts.createSourceFile('test.ts', code, ts.ScriptTarget.Latest, true);
  let body: ts.Node | undefined;

  const walk = (node: ts.Node) => {
    if (body) return;
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isGetAccessorDeclaration(node) ||
        ts.isSetAccessorDeclaration(node)) &&
      node.body
    ) {
      body = node.body;
      return;
    }
    ts.forEachChild(node, walk);
  };
  walk(source);

  if (!body) throw new Error('No function body found in code');
  return { body, source };
}

describe('calculateCyclomatic', () => {
  it('returns 1 for an empty function', () => {
    const { body, source } = parseFunctionBody('function empty() {}');
    expect(calculateCyclomatic(body, source)).toBe(1);
  });

  it('increments for if statements', () => {
    const { body, source } = parseFunctionBody(`
      function withIf(x: number) {
        if (x > 0) return 1;
        return 0;
      }
    `);
    expect(calculateCyclomatic(body, source)).toBe(2);
  });

  it('increments for optional chaining', () => {
    const { body, source } = parseFunctionBody(`
      function optional(obj: any) {
        return obj?.prop?.method?.();
      }
    `);
    // 1 base + 3 optional chains = 4
    expect(calculateCyclomatic(body, source)).toBe(4);
  });

  it('increments for nullish coalescing', () => {
    const { body, source } = parseFunctionBody(`
      function nullish(x?: string) {
        return x ?? 'default';
      }
    `);
    expect(calculateCyclomatic(body, source)).toBe(2);
  });

  it("handles async/await (not increments, but shouldn't crash)", () => {
    const { body, source } = parseFunctionBody(`
      async function asyncFunc() {
        await doSomething();
        return 1;
      }
    `);
    expect(calculateCyclomatic(body, source)).toBe(1);
  });
});

describe('calculateCognitive', () => {
  it('counts a simple if as 1', () => {
    const { body, source } = parseFunctionBody(`
      function simple(x: number) {
        if (x > 0) return 1;
        return 0;
      }
    `);
    expect(calculateCognitive(body, source)).toBe(1);
  });

  it('adds nesting penalty for nested if', () => {
    const { body, source } = parseFunctionBody(`
      function nested(x: number, y: number) {
        if (x > 0) {
          if (y > 0) return 1;
        }
        return 0;
      }
    `);
    // outer: 1, inner: 1 + 1 depth = 2. Total: 3
    expect(calculateCognitive(body, source)).toBe(3);
  });

  it('handles arrow function bodies as nesting', () => {
    const { body, source } = parseFunctionBody(`
      function highOrder() {
        return [1, 2].map(x => {
          if (x > 0) return x;
          return 0;
        });
      }
    `);
    // arrow function expression: depth 1
    // if inside: 1 + 1 depth = 2
    expect(calculateCognitive(body, source)).toBe(2);
  });

  it('handles nested functions', () => {
    const { body, source } = parseFunctionBody(`
      function outer() {
        function inner() {
          if (true) return 1;
        }
        inner();
      }
    `);
    // inner function: depth 1
    // if inside: 1 + 1 depth = 2
    expect(calculateCognitive(body, source)).toBe(2);
  });
});

describe('ComplexityRule finding functions', () => {
  it('finds getters and setters', () => {
    const { body: getBody } = parseFunctionBody(`
            class A {
                get prop() { return 1; }
            }
        `);
    expect(getBody).toBeDefined();

    const { body: setBody } = parseFunctionBody(`
            class A {
                set prop(v: number) { this._v = v; }
            }
        `);
    expect(setBody).toBeDefined();
  });
});
