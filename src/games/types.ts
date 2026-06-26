import type { Rng } from './rng';

// The five interaction archetypes Karp's 21 collapse into (reduction families).
export type Archetype =
  | 'number-packing'
  | 'set-cover'
  | 'graph-select'
  | 'graph-path'
  | 'logic-assignment'
  | 'nonogram';

// A generated instance carries the puzzle the player sees plus the hidden
// solution used to (a) guarantee solvability and (b) drive the conformance tests.
export interface Generated<TState, TMove> {
  puzzle: TState;
  solution: TMove[];
}

// Difficulty is a single continuous knob (Elo-scale), mapped per game.
export type Difficulty = number;

// Every NP-complete game in the box implements this contract. TState is the
// game-specific board; TMove is one player action (also used to replay solutions).
export interface PuzzleGame<TState, TMove> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly archetype: Archetype;
  // Build a guaranteed-solvable instance at difficulty D (generate-solved-then-strip).
  generate(difficulty: Difficulty, rng: Rng): Generated<TState, TMove>;
  // Pure: apply one move, returning a new state (immutable).
  applyMove(state: TState, move: TMove): TState;
  // Cheap verifier — the value NP-completeness buys us.
  isSolved(state: TState): boolean;
  // 0..100 progress proxy; 0 on a fresh puzzle, 100 when solved.
  progress(state: TState): number;
  // Optional: count valid solutions up to `max`, stopping early once max is
  // reached. Used by generateUnique to reject puzzles with multiple solutions.
  countSolutions?(puzzle: TState, max: number): number;
}

// Replay a solution onto a fresh puzzle — shared by tests and (later) hint/replay UI.
export function applySolution<TState, TMove>(
  game: PuzzleGame<TState, TMove>,
  gen: Generated<TState, TMove>,
): TState {
  return gen.solution.reduce((s, m) => game.applyMove(s, m), gen.puzzle);
}
