import { describe, it, expect } from 'vitest';
import { detectCycles } from '../src/rules/circular-dependencies';

describe('detectCycles', () => {
  it('returns empty array when there are no cycles', () => {
    const graph = new Map<string, Set<string>>([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['c.ts'])],
      ['c.ts', new Set()],
    ]);

    const cycles = detectCycles(graph);
    expect(cycles).toEqual([]);
  });

  it('detects a simple 2-node cycle', () => {
    const graph = new Map<string, Set<string>>([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['a.ts'])],
    ]);

    const cycles = detectCycles(graph);
    expect(cycles).toHaveLength(1);
    // Normalized: lexicographically smallest first
    expect(cycles[0]).toEqual(['a.ts', 'b.ts']);
  });

  it('detects a 3-node cycle', () => {
    const graph = new Map<string, Set<string>>([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['c.ts'])],
      ['c.ts', new Set(['a.ts'])],
    ]);

    const cycles = detectCycles(graph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });

  it('normalizes cycle to start with lexicographically smallest node', () => {
    const graph = new Map<string, Set<string>>([
      ['c.ts', new Set(['a.ts'])],
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['c.ts'])],
    ]);

    const cycles = detectCycles(graph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0][0]).toBe('a.ts');
  });

  it('detects self-cycle', () => {
    const graph = new Map<string, Set<string>>([
      ['a.ts', new Set(['a.ts'])],
    ]);

    const cycles = detectCycles(graph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(['a.ts']);
  });

  it('deduplicates identical cycles found from different starting nodes', () => {
    const graph = new Map<string, Set<string>>([
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set(['a.ts'])],
    ]);

    const cycles = detectCycles(graph);
    // Should only report the cycle once, not twice
    expect(cycles).toHaveLength(1);
  });

  it('handles disconnected graph components', () => {
    const graph = new Map<string, Set<string>>([
      // Component 1: no cycle
      ['a.ts', new Set(['b.ts'])],
      ['b.ts', new Set()],
      // Component 2: has a cycle
      ['c.ts', new Set(['d.ts'])],
      ['d.ts', new Set(['c.ts'])],
    ]);

    const cycles = detectCycles(graph);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toEqual(['c.ts', 'd.ts']);
  });

  it('handles empty graph', () => {
    const graph = new Map<string, Set<string>>();
    const cycles = detectCycles(graph);
    expect(cycles).toEqual([]);
  });
});
