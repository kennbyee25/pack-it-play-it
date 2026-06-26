import type { PuzzleGame } from '../types';
import type { Rng } from '../rng';
import type { Solver, SolverBudget, SolverResult, SolverSpec } from './types';

// Default budget — generous enough for our (small, NP-hard) instance sizes, but
// bounded so nothing ever hangs. 2^20 covers every current game's search space.
export const DEFAULT_BUDGET: Required<SolverBudget> = {
  maxIterations: 1 << 20,
  timeoutMs: 2000,
};

const withBudget = (b?: SolverBudget): Required<SolverBudget> => ({
  maxIterations: b?.maxIterations ?? DEFAULT_BUDGET.maxIterations,
  timeoutMs: b?.timeoutMs ?? DEFAULT_BUDGET.timeoutMs,
});

// Brute force: walk the enumerated search space, return the first solved state.
// Template-method style — the loop/budget/timing live here; the spec only enumerates.
export function bruteForceSolver<TState, TMove>(
  game: PuzzleGame<TState, TMove>,
  spec: SolverSpec<TState>,
): Solver<TState> {
  return {
    name: `${game.id}/brute-force`,
    kind: 'brute-force',
    solve(puzzle, budget): SolverResult<TState> {
      const { maxIterations, timeoutMs } = withBudget(budget);
      const start = performance.now();
      let iterations = 0;
      for (const candidate of spec.enumerate(puzzle)) {
        iterations++;
        if (game.isSolved(candidate)) {
          return { solved: true, solution: candidate, iterations, timeMs: performance.now() - start };
        }
        if (iterations >= maxIterations || performance.now() - start > timeoutMs) break;
      }
      return { solved: false, solution: null, iterations, timeMs: performance.now() - start };
    },
  };
}

// Random: sample complete candidates until one solves or the budget runs out.
export function randomSolver<TState, TMove>(
  game: PuzzleGame<TState, TMove>,
  spec: SolverSpec<TState>,
  rng: Rng,
): Solver<TState> {
  return {
    name: `${game.id}/random`,
    kind: 'random',
    solve(puzzle, budget): SolverResult<TState> {
      const { maxIterations, timeoutMs } = withBudget(budget);
      const start = performance.now();
      let iterations = 0;
      while (iterations < maxIterations && performance.now() - start <= timeoutMs) {
        iterations++;
        const candidate = spec.randomCandidate(puzzle, rng);
        if (game.isSolved(candidate)) {
          return { solved: true, solution: candidate, iterations, timeMs: performance.now() - start };
        }
      }
      return { solved: false, solution: null, iterations, timeMs: performance.now() - start };
    },
  };
}

// Count solutions up to `cap` (early-out — we only ever need to tell 0/1/≥2 apart
// for uniqueness). Returns the exact count when it is < cap.
export function countSolutions<TState, TMove>(
  game: PuzzleGame<TState, TMove>,
  spec: SolverSpec<TState>,
  puzzle: TState,
  cap = 2,
): number {
  let count = 0;
  for (const candidate of spec.enumerate(puzzle)) {
    if (game.isSolved(candidate)) {
      count++;
      if (count >= cap) return count;
    }
  }
  return count;
}
