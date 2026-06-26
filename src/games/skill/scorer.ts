// Outcome scorer: collapse a play attempt into a single score ∈ [0,1] that feeds
// the skill estimator. A clean solve scores high; slow or wasteful solves score
// lower; an unsolved attempt scores 0. Parameterized — no magic numbers.

export const SCORE = {
  solveBase: 0.6, // a correct solve is worth at least this
  speedBonus: 0.25, // up to this much for solving quickly
  cleanBonus: 0.15, // up to this much for no wasted moves
  fastSeconds: 15, // at/under this ⇒ full speed bonus
  slowSeconds: 90, // at/over this ⇒ no speed bonus
} as const;

export interface Attempt {
  solved: boolean;
  seconds: number;
  moves: number;
  optimalMoves: number; // length of the planted solution
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function scoreOutcome(a: Attempt): number {
  if (!a.solved) return 0;

  // Speed: linear from fastSeconds (full) to slowSeconds (none).
  const span = SCORE.slowSeconds - SCORE.fastSeconds;
  const speed = clamp01((SCORE.slowSeconds - a.seconds) / span);

  // Cleanliness: fraction of moves that weren't wasted (optimal / actual).
  const clean = a.moves > 0 ? clamp01(a.optimalMoves / a.moves) : 1;

  return clamp01(SCORE.solveBase + SCORE.speedBonus * speed + SCORE.cleanBonus * clean);
}
