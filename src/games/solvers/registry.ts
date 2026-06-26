import type { PuzzleGame } from '../types';
import type { Rng } from '../rng';
import { makeRng } from '../rng';
import type { GameSolvers, Solver, SolverSpec } from './types';
import { bruteForceSolver, randomSolver, countSolutions as countFor } from './base';
import { getGame } from '../registry';

import { threeSatSpec } from '../threeSat/solver';
import { setCoverSpec } from '../setCover/solver';
import { subsetSumSpec } from '../subsetSum/solver';

// Games with a registered search space. Extend this map as breadth-fill adds
// solvers (Open-Closed: one entry per game, no edits elsewhere).
const SPECS: Record<string, SolverSpec<any>> = {
  'three-sat': threeSatSpec,
  'set-cover': setCoverSpec,
  'subset-sum': subsetSumSpec,
};

export const SOLVER_GAME_IDS = Object.keys(SPECS);
export const hasSolver = (gameId: string): boolean => gameId in SPECS;

// Get a game + its search space, or undefined if no solver is registered.
export function getGameSolvers(gameId: string): GameSolvers<any, any> | undefined {
  const spec = SPECS[gameId];
  const game = getGame(gameId);
  if (!spec || !game) return undefined;
  return { game, spec };
}

// Brute-force + random solver pair for a game (mirrors the game registry).
export function getSolvers(
  gameId: string,
  rng: Rng = makeRng(),
): { bruteForce: Solver<any>; random: Solver<any> } | undefined {
  const gs = getGameSolvers(gameId);
  if (!gs) return undefined;
  return {
    bruteForce: bruteForceSolver(gs.game, gs.spec),
    random: randomSolver(gs.game, gs.spec, rng),
  };
}

// Count solutions for a puzzle of a given game, capped (default 2 = uniqueness probe).
export function countSolutions(gameId: string, puzzle: unknown, cap = 2): number | undefined {
  const gs = getGameSolvers(gameId);
  if (!gs) return undefined;
  return countFor(gs.game as PuzzleGame<unknown, unknown>, gs.spec, puzzle, cap);
}
