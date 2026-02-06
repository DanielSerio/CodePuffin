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
      (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
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

  it('returns 1 for a linear function', () => {
    const { body, source } = parseFunctionBody(`
      function linear() {
        const a = 1;
        const b = 2;
        return a + b;
      }
    `);
    expect(calculateCyclomatic(body, source)).toBe(1);
  });

  it('increments for if statements', () => {
    const { body, source } = parseFunctionBody(`
      function withIf(x: number) {
        if (x > 0) {
          return 1;
        }
        return 0;
      }
    `);
    expect(calculateCyclomatic(body, source)).toBe(2);
  });

  it('increments for else-if chains', () => {
    const { body, source } = parseFunctionBody(`
      function elseIf(x: number) {
        if (x > 0) {
          return 1;
        } else if (x < 0) {
          return -1;
        } else {
          return 0;
        }
      }
    `);
    // if + else if = 2 branches
    expect(calculateCyclomatic(body, source)).toBe(3);
  });

  it('increments for loops', () => {
    const { body, source } = parseFunctionBody(`
      function loops(arr: number[]) {
        for (let i = 0; i < arr.length; i++) {}
        for (const x of arr) {}
        while (true) { break; }
        do {} while (false);
      }
    `);
    // 1 base + 4 loops
    expect(calculateCyclomatic(body, source)).toBe(5);
  });

  it('increments for logical operators', () => {
    const { body, source } = parseFunctionBody(`
      function logical(a: boolean, b: boolean, c: boolean) {
        if (a && b || c) {
          return true;
        }
        return false;
      }
    `);
    // 1 base + 1 if + 1 && + 1 || = 4
    expect(calculateCyclomatic(body, source)).toBe(4);
  });

  it('increments for switch cases', () => {
    const { body, source } = parseFunctionBody(`
      function switcher(x: string) {
        switch (x) {
          case 'a': return 1;
          case 'b': return 2;
          default: return 0;
        }
      }
    `);
    // 1 base + 2 case clauses (default doesn't count)
    expect(calculateCyclomatic(body, source)).toBe(3);
  });

  it('increments for ternary expressions', () => {
    const { body, source } = parseFunctionBody(`
      function ternary(x: number) {
        return x > 0 ? 'positive' : 'non-positive';
      }
    `);
    expect(calculateCyclomatic(body, source)).toBe(2);
  });

  it('increments for catch clause', () => {
    const { body, source } = parseFunctionBody(`
      function tryCatch() {
        try {
          doSomething();
        } catch (e) {
          handleError(e);
        }
      }
    `);
    expect(calculateCyclomatic(body, source)).toBe(2);
  });

  it('increments for nullish coalescing', () => {
    const { body, source } = parseFunctionBody(`
      function nullish(x?: string) {
        return x ?? 'default';
      }
    `);
    expect(calculateCyclomatic(body, source)).toBe(2);
  });
});

describe('calculateCognitive', () => {
  it('returns 0 for an empty function', () => {
    const { body, source } = parseFunctionBody('function empty() {}');
    expect(calculateCognitive(body, source)).toBe(0);
  });

  it('returns 0 for a linear function', () => {
    const { body, source } = parseFunctionBody(`
      function linear() {
        const a = 1;
        return a;
      }
    `);
    expect(calculateCognitive(body, source)).toBe(0);
  });

  it('counts a simple if as 1', () => {
    const { body, source } = parseFunctionBody(`
      function simple(x: number) {
        if (x > 0) {
          return 1;
        }
        return 0;
      }
    `);
    // if at depth 0: +1 + 0 = 1
    expect(calculateCognitive(body, source)).toBe(1);
  });

  it('adds nesting penalty for nested if', () => {
    const { body, source } = parseFunctionBody(`
      function nested(x: number, y: number) {
        if (x > 0) {
          if (y > 0) {
            return 1;
          }
        }
        return 0;
      }
    `);
    // outer if at depth 0: +1
    // inner if at depth 1: +1 + 1 = 2
    // total: 3
    expect(calculateCognitive(body, source)).toBe(3);
  });

  it('handles else-if without additional nesting', () => {
    const { body, source } = parseFunctionBody(`
      function elseIf(x: number) {
        if (x > 0) {
          return 1;
        } else if (x < 0) {
          return -1;
        } else {
          return 0;
        }
      }
    `);
    // if: +1, else if: +1, else: +1 = 3
    expect(calculateCognitive(body, source)).toBe(3);
  });

  it('counts logical operators in conditions', () => {
    const { body, source } = parseFunctionBody(`
      function logical(a: boolean, b: boolean) {
        if (a && b) {
          return true;
        }
        return false;
      }
    `);
    // if at depth 0: +1, && in condition: +1 = 2
    expect(calculateCognitive(body, source)).toBe(2);
  });

  it('counts for loops with nesting', () => {
    const { body, source } = parseFunctionBody(`
      function loops(items: number[][]) {
        for (const row of items) {
          for (const item of row) {
            if (item > 0) {
              console.log(item);
            }
          }
        }
      }
    `);
    // outer for at depth 0: +1
    // inner for at depth 1: +1 + 1 = 2
    // if at depth 2: +1 + 2 = 3
    // total: 6
    expect(calculateCognitive(body, source)).toBe(6);
  });

  it('counts switch with nesting penalty', () => {
    const { body, source } = parseFunctionBody(`
      function switcher(x: string) {
        switch (x) {
          case 'a': break;
          case 'b': break;
        }
      }
    `);
    // switch at depth 0: +1
    expect(calculateCognitive(body, source)).toBe(1);
  });

  it('counts catch with nesting penalty', () => {
    const { body, source } = parseFunctionBody(`
      function tryCatch() {
        try {
          doSomething();
        } catch (e) {
          if (e instanceof Error) {
            throw e;
          }
        }
      }
    `);
    // catch at depth 0: +1
    // if inside catch at depth 1: +1 + 1 = 2
    // total: 3
    expect(calculateCognitive(body, source)).toBe(3);
  });
});
