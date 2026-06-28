import { describe, it, expect } from 'vitest';
import { accrueActive, IDLE_CAP_MS } from './activeTime';

describe('accrueActive', () => {
  it('adds short gaps in full', () => {
    expect(accrueActive(0, 5000)).toBe(5000);
    expect(accrueActive(5000, 3000)).toBe(8000);
  });

  it('clamps a long idle gap to the cap', () => {
    expect(accrueActive(1000, 100 * 60 * 1000)).toBe(1000 + IDLE_CAP_MS);
  });

  it('ignores negative/zero gaps (clock skew)', () => {
    expect(accrueActive(2000, -500)).toBe(2000);
    expect(accrueActive(2000, 0)).toBe(2000);
  });
});
