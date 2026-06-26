import { describe, it, expect } from 'vitest';
import { makeRng } from '../rng';
import { getGame, GAMES } from '../registry';
import { getSolvers, countSolutions, getGameSolvers, SOLVER_GAME_IDS } from './registry';
import { bruteForceSolver, countSolutions as countFor } from './base';
import { uniquify } from './uniquify';

const DIFFICULTIES = [0, 300, 800];

describe('solver registry', () => {
  it('registers solvers for the uniqueness-supported games', () => {
    expect(SOLVER_GAME_IDS).toEqual(expect.arrayContaining(['three-sat', 'set-cover', 'subset-sum']));
  });

  it('returns undefined for a game with no solver', () => {
    expect(getSolvers('graph-coloring')).toBeUndefined();
    expect(countSolutions('graph-coloring', {})).toBeUndefined();
  });

  it('covers every game except the two documented exclusions', () => {
    const allIds = GAMES.map((g) => g.id);
    const excluded = ['graph-coloring', 'nonogram']; // symmetry / infeasible enumeration
    const expected = allIds.filter((id) => !excluded.includes(id)).sort();
    expect([...SOLVER_GAME_IDS].sort()).toEqual(expected);
  });
});

describe.each(SOLVER_GAME_IDS)('solvers for %s', (gameId) => {
  const game = getGame(gameId)!;

  it.each(DIFFICULTIES)('brute force finds a valid solution (d=%i)', (d) => {
    const gen = game.generate(d, makeRng(d + 1));
    const solver = getSolvers(gameId, makeRng(7))!.bruteForce;
    const res = solver.solve(gen.puzzle);
    expect(res.solved).toBe(true);
    expect(res.solution).not.toBeNull();
    expect(game.isSolved(res.solution!)).toBe(true);
    expect(res.iterations).toBeGreaterThan(0);
  });

  it('random solver respects budget and never hangs', () => {
    const gen = game.generate(300, makeRng(2));
    const solver = getSolvers(gameId, makeRng(99))!.random;
    const res = solver.solve(gen.puzzle, { maxIterations: 50, timeoutMs: 1000 });
    expect(res.iterations).toBeLessThanOrEqual(50);
    expect(res.timeMs).toBeLessThan(1000);
    if (res.solved) expect(game.isSolved(res.solution!)).toBe(true);
  });

  it('counts at least the planted solution', () => {
    const gen = game.generate(300, makeRng(3));
    const count = countSolutions(gameId, gen.puzzle, 5);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe('countSolutions discriminates unique vs ambiguous (subset-sum)', () => {
  const game = getGame('subset-sum')!;
  const { spec } = getGameSolvers('subset-sum')!;

  it('an ambiguous instance counts >= 2', () => {
    // {1,1} both summing to target 1 individually => two single-item solutions.
    const ambiguous = {
      items: [{ value: 1 }, { value: 1 }, { value: 5 }],
      selected: [false, false, false],
      target: 1,
      targetLabel: '1',
      instruction: '',
    };
    expect(countFor(game, spec, ambiguous, 5)).toBeGreaterThanOrEqual(2);
  });

  it('a unique instance counts exactly 1', () => {
    // Only {2,3} sums to 5; no other subset of {2,3,10} does.
    const unique = {
      items: [{ value: 2 }, { value: 3 }, { value: 10 }],
      selected: [false, false, false],
      target: 5,
      targetLabel: '5',
      instruction: '',
    };
    expect(countFor(game, spec, unique, 5)).toBe(1);
  });
});

describe('uniquify', () => {
  // set-cover instances are frequently unique, so reject-sampling reliably lands one.
  it('reaches an exactly-one-solution instance for set-cover', () => {
    const { game, spec } = getGameSolvers('set-cover')!;
    const gen = uniquify(game, spec, 100, makeRng(42));
    expect(countFor(game, spec, gen.puzzle, 2)).toBe(1);
  });

  // Whatever uniquify returns (unique or fallback) must always be a solvable instance.
  it.each(['three-sat', 'set-cover', 'subset-sum'])('%s output is always solvable', (gameId) => {
    const { game, spec } = getGameSolvers(gameId)!;
    const gen = uniquify(game, spec, 300, makeRng(42));
    expect(bruteForceSolver(game, spec).solve(gen.puzzle).solved).toBe(true);
  });

  // KNOWN LIMITATION (documented in docs/plans/solver-layer.md): the 3-SAT and
  // subset-sum *generators* rarely emit unique instances (~0% and ~1-4%), so
  // uniquify falls back. Making those uniqueness-friendly is generator work, not
  // solver work — tracked as the next step for the unique-solution feature.
});
