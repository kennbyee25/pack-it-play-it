import { clampDifficulty } from './settings';

// Optimal-challenge thresholds. Tunable; see docs/plans/infinite-adaptive-mode.md.
export const ADAPT = {
  step: 250, // difficulty delta per adjustment (~one size unit for most games)
  quickSeconds: 30, // solved at/under this (with no wasted moves) => harder
  slowSeconds: 45, // over this => easier
} as const;

export interface SolveMetrics {
  moves: number; // moves the player actually made
  optimalMoves: number; // length of the planted solution (no wasted moves)
  seconds: number; // time to solve
}

// Decide the next difficulty for a game after a solve:
// - mistake (more moves than optimal) OR slow (> slowSeconds) => decrease
// - optimal (exactly optimal moves) AND quick (<= quickSeconds) => increase
// - otherwise unchanged (neutral band, and partial/auto solves don't bump up)
export function adaptDifficulty(current: number, m: SolveMetrics): number {
  const mistake = m.moves > m.optimalMoves;
  const slow = m.seconds > ADAPT.slowSeconds;
  const optimal = m.moves === m.optimalMoves;
  const quick = m.seconds <= ADAPT.quickSeconds;

  let next = current;
  if (mistake || slow) next = current - ADAPT.step;
  else if (optimal && quick) next = current + ADAPT.step;
  return clampDifficulty(next);
}
