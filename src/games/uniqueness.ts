import type { PuzzleGame, Generated, Difficulty } from './types';
import type { Rng } from './rng';

export interface UniqueOptions {
  unique: boolean;
  maxAttempts?: number;
}

// Wrapper around game.generate that retries until the puzzle has exactly one
// solution (per game.countSolutions). Falls back silently if the game doesn't
// implement countSolutions, or if maxAttempts is exhausted.
export function generateUnique<TState, TMove>(
  game: PuzzleGame<TState, TMove>,
  difficulty: Difficulty,
  rng: Rng,
  opts: UniqueOptions = { unique: false },
): Generated<TState, TMove> {
  const { unique, maxAttempts = 50 } = opts;

  const first = game.generate(difficulty, rng);
  if (!unique || !game.countSolutions) return first;

  if (game.countSolutions(first.puzzle, 2) === 1) return first;

  for (let i = 1; i < maxAttempts; i++) {
    const attempt = game.generate(difficulty, rng);
    if (game.countSolutions(attempt.puzzle, 2) === 1) return attempt;
  }

  // Exhausted retries — return whatever came last rather than blocking forever.
  return game.generate(difficulty, rng);
}
