import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import type { SolverSpec } from './types';
import { countSolutions } from './base';

// Reject-sample generation until the instance has exactly one solution, for games
// where uniqueness is well-defined (3-SAT, set-cover, subset-sum, …). Falls back
// to the last generated instance after `cap` tries so the puzzle stream never blocks.
//
// NOTE: graph-coloring is excluded by design — proper colorings have color-swap
// symmetry, so they are never unique up to permutation (needs a separate redesign).
export function uniquify<TState, TMove>(
  game: PuzzleGame<TState, TMove>,
  spec: SolverSpec<TState>,
  difficulty: Difficulty,
  rng: Rng,
  cap = 25,
): Generated<TState, TMove> {
  let last = game.generate(difficulty, rng);
  for (let i = 0; i < cap; i++) {
    if (countSolutions(game, spec, last.puzzle, 2) === 1) return last;
    last = game.generate(difficulty, rng);
  }
  return last; // fall back; don't block the stream
}
