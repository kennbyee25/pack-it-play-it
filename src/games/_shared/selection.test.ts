import { describe, it, expect } from 'vitest';
import { toggleSelected } from './selection';

describe('toggleSelected', () => {
  it('flips the boolean at the given index', () => {
    const s = { selected: [false, false, false], other: 1 };
    expect(toggleSelected(s, 1).selected).toEqual([false, true, false]);
    expect(toggleSelected({ selected: [true] }, 0).selected).toEqual([false]);
  });

  it('is immutable — leaves the input state and array untouched', () => {
    const s = { selected: [false, true] };
    const next = toggleSelected(s, 0);
    expect(s.selected).toEqual([false, true]); // original unchanged
    expect(next).not.toBe(s);
    expect(next.selected).not.toBe(s.selected);
  });

  it('preserves other state fields', () => {
    const s = { selected: [false], n: 7, label: 'x' };
    expect(toggleSelected(s, 0)).toEqual({ selected: [true], n: 7, label: 'x' });
  });
});
