import { describe, it, expect } from 'vitest';
import { normEdge, edgeKey, edgeKeyOf, edgeAccumulator } from './graph';

describe('graph helpers', () => {
  it('normEdge orders endpoints ascending', () => {
    expect(normEdge(3, 1)).toEqual([1, 3]);
    expect(normEdge(1, 3)).toEqual([1, 3]);
  });

  it('edgeKey is order-independent; edgeKeyOf matches', () => {
    expect(edgeKey(2, 5)).toBe('2-5');
    expect(edgeKey(5, 2)).toBe('2-5');
    expect(edgeKeyOf([5, 2])).toBe('2-5');
  });
});

describe('edgeAccumulator', () => {
  it('dedups regardless of endpoint order and normalizes stored edges', () => {
    const acc = edgeAccumulator();
    acc.add(2, 1);
    acc.add(1, 2); // duplicate
    acc.add(3, 4);
    expect(acc.edges).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('has() reports membership in either order', () => {
    const acc = edgeAccumulator();
    acc.add(0, 4);
    expect(acc.has(4, 0)).toBe(true);
    expect(acc.has(0, 1)).toBe(false);
  });
});
