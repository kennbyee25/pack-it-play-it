import type { PuzzleGame } from '../types';
import type { Rng } from '../rng';

// Telemetry for one solve attempt (the MVP5 surface + uniqueness counter).
export interface SolverResult<TState> {
  solved: boolean;
  solution: TState | null; // a state for which game.isSolved(solution) === true
  iterations: number;
  timeMs: number;
  solutionCount?: number; // populated by countSolutions (uniqueness)
}

// Bound the search so an NP-hard instance never hangs the UI or a test.
export interface SolverBudget {
  maxIterations?: number;
  timeoutMs?: number;
}

export interface Solver<TState> {
  readonly name: string;
  readonly kind: 'brute-force' | 'random';
  solve(puzzle: TState, budget?: SolverBudget): SolverResult<TState>;
}

// A game-specific search space. The generic solvers (base.ts) own the budget,
// timing and the isSolved check (Dependency Inversion); a SolverSpec only knows
// how to enumerate / sample candidate *complete* states for its game.
export interface SolverSpec<TState> {
  // All candidate complete states for this puzzle (e.g. every assignment / subset).
  enumerate(puzzle: TState): Iterable<TState>;
  // One random complete candidate (drives the random solver).
  randomCandidate(puzzle: TState, rng: Rng): TState;
}

// Bundle a game with its search space — the unit the registry hands out.
export interface GameSolvers<TState, TMove> {
  game: PuzzleGame<TState, TMove>;
  spec: SolverSpec<TState>;
}
