import { clampDifficulty } from './settings';

// Optimal-challenge thresholds. Tunable; see docs/plans/infinite-adaptive-mode.md.
export const ADAPT = {
  step: 50, // difficulty delta per adjustment
  quickSeconds: 30, // solved at/under this => harder
  slowSeconds: 45, // solved at/over this => easier
} as const;

export interface SolveMetrics {
  moves: number; // moves the player actually made
  optimalMoves: number; // length of the planted solution (no wasted moves)
  seconds: number; // time to solve
}

// Decide the next difficulty for a game after a solve, keyed on TIME:
//   quick (<= quickSeconds) => harder
//   slow  (>= slowSeconds)  => easier
//   otherwise               => unchanged (neutral band)
//
// Move count is deliberately ignored: it is not comparable across the suite's
// varied interfaces (e.g. the cycling color picker for graph coloring / max cut
// takes several clicks per node, so raw moves vastly exceed the planted solution
// length and would falsely flag every solve as a mistake). Time is the one
// signal that means the same thing in every game.
export function adaptDifficulty(current: number, m: SolveMetrics): number {
  let next = current;
  if (m.seconds <= ADAPT.quickSeconds) next = current + ADAPT.step;
  else if (m.seconds >= ADAPT.slowSeconds) next = current - ADAPT.step;
  return clampDifficulty(next);
}

// Skipping a puzzle without solving it eases that game by one step.
export function easeDifficulty(current: number): number {
  return clampDifficulty(current - ADAPT.step);
}
