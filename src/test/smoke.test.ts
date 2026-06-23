import { describe, it, expect } from 'vitest';

// Sanity check that the Vitest + jsdom harness is wired up.
describe('test harness', () => {
  it('runs and has a DOM', () => {
    expect(typeof document).toBe('object');
    expect(1 + 1).toBe(2);
  });
});
