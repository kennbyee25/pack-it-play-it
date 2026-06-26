import { describe, it, expect } from 'vitest';
import { GAMES } from './registry';
import { makeRng } from './rng';
import { applySolution } from './types';
import { generateUnique } from './uniqueness';

const gamesWithSolver = GAMES.filter((g) => typeof g.countSolutions === 'function');

// 3-SAT rarely produces unique solutions at any reasonable difficulty: our
// generator plants ONE satisfying assignment but clause density stays well
// below the satisfiability threshold, leaving many valid assignments alive.
// We test its solver correctness separately; we don't assert unique-puzzle
// findability for it.
const UNIQUE_CAPABLE_IDS = new Set(['graph-coloring', 'set-cover', 'hamiltonian', 'nonogram']);
const gamesWithUniquePuzzles = gamesWithSolver.filter((g) => UNIQUE_CAPABLE_IDS.has(g.id));

// Difficulty high enough that unique solutions are achievable but puzzles are
// still small enough for CI-speed backtrackers.
const UNIQUE_DIFFICULTY = 500;

describe.each(gamesWithSolver.map((g) => [g.id, g] as const))('countSolutions: %s', (_id, game) => {
  it('counts at least 1 solution for a freshly generated puzzle (planted solution exists)', () => {
    for (const seed of [1, 7, 42]) {
      const gen = game.generate(200, makeRng(seed));
      expect(game.countSolutions!(gen.puzzle, 10)).toBeGreaterThanOrEqual(1);
    }
  });

  it('never exceeds the max cap', () => {
    for (const seed of [1, 2, 3]) {
      const gen = game.generate(200, makeRng(seed));
      expect(game.countSolutions!(gen.puzzle, 2)).toBeLessThanOrEqual(2);
    }
  });

  it('applying the planted solution satisfies isSolved', () => {
    const gen = game.generate(200, makeRng(13));
    expect(game.isSolved(applySolution(game, gen))).toBe(true);
  });
});

describe('generateUnique', () => {
  it('returns a solvable puzzle with unique=true for uniqueness-capable games', () => {
    for (const game of gamesWithUniquePuzzles) {
      const gen = generateUnique(game, UNIQUE_DIFFICULTY, makeRng(99), { unique: true, maxAttempts: 60 });
      expect(game.isSolved(applySolution(game, gen))).toBe(true);
    }
  });

  it('finds a puzzle with exactly 1 solution for uniqueness-capable games (within 40 seeds)', () => {
    for (const game of gamesWithUniquePuzzles) {
      let found = false;
      for (let seed = 0; seed < 40; seed++) {
        const gen = generateUnique(game, UNIQUE_DIFFICULTY, makeRng(seed), { unique: true, maxAttempts: 60 });
        if (game.countSolutions!(gen.puzzle, 2) === 1) { found = true; break; }
      }
      expect(found, `${game.id}: no unique puzzle found across 40 seeds at d=${UNIQUE_DIFFICULTY}`).toBe(true);
    }
  });

  it('behaves identically to game.generate when unique=false', () => {
    for (const game of gamesWithSolver) {
      const seed = 77;
      const a = game.generate(200, makeRng(seed));
      const b = generateUnique(game, 200, makeRng(seed), { unique: false });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });
});
