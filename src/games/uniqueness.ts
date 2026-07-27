import type { PuzzleGame, Generated, Difficulty } from './types';
import type { Rng } from './rng';

export interface UniqueOptions {
  unique: boolean;
  /** How many generate+count cycles before giving up (default 500). */
  maxAttempts?: number;
}

/** Wrapper around game.generate that retries until the puzzle has exactly one
 *  solution (per game.countSolutions). Returns null if the game doesn't
 *  implement countSolutions, unique=false is passed, or maxAttempts is
 *  exhausted — the caller picks the fallback. */
export function generateUnique<TState, TMove>(
  game: PuzzleGame<TState, TMove>,
  difficulty: Difficulty,
  rng: Rng,
  opts: UniqueOptions = { unique: false },
): Generated<TState, TMove> | null {
  const { unique, maxAttempts = 500 } = opts;

  const first = game.generate(difficulty, rng);
  if (!unique || !game.countSolutions) return null;

  if (game.countSolutions(first.puzzle, 2) === 1) return first;

  for (let i = 1; i < maxAttempts; i++) {
    const attempt = game.generate(difficulty, rng);
    if (game.countSolutions(attempt.puzzle, 2) === 1) return attempt;
  }

  // Exhausted retries — caller should fall back to game.generate()
  return null;
}
