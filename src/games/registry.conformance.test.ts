import { describe, it, expect } from 'vitest';
import { GAMES } from './registry';
import { applySolution } from './types';
import { makeRng } from './rng';

// One parameterized suite that every registered game must pass — this is the
// contract that lets the box treat all NP-complete games uniformly.
describe.each(GAMES.map((g) => [g.id, g] as const))('conformance: %s', (_id, game) => {
  const seeds = [1, 2, 7, 42, 1337];
  const difficulties = [100, 800, 1600];

  it('generates a guaranteed-solvable instance (its solution satisfies isSolved)', () => {
    for (const d of difficulties) {
      for (const seed of seeds) {
        const gen = game.generate(d, makeRng(seed));
        const solved = applySolution(game, gen);
        expect(game.isSolved(solved)).toBe(true);
      }
    }
  });

  it('a freshly generated (stripped) instance is not already solved', () => {
    // Use a non-trivial difficulty so the puzzle has real structure.
    const gen = game.generate(1200, makeRng(99));
    expect(game.isSolved(gen.puzzle)).toBe(false);
  });

  it('progress is 0 on a fresh puzzle and 100 when solved', () => {
    const gen = game.generate(800, makeRng(5));
    expect(game.progress(gen.puzzle)).toBe(0);
    expect(game.progress(applySolution(game, gen))).toBe(100);
  });

  it('applyMove is immutable (does not mutate prior state)', () => {
    const gen = game.generate(800, makeRng(11));
    const before = JSON.stringify(gen.puzzle);
    game.applyMove(gen.puzzle, gen.solution[0]);
    expect(JSON.stringify(gen.puzzle)).toBe(before);
  });

  it('is deterministic for a fixed seed', () => {
    const a = game.generate(900, makeRng(123));
    const b = game.generate(900, makeRng(123));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
