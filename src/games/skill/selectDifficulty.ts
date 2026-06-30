// Difficulty selection from a PlayerRating.
// Inverts the Elo expected-score formula to find D that yields pTarget.
// Adds exploration jitter proportional to RD, clamps to the DIFFICULTY range,
// and caps the per-puzzle jump to avoid wild swings.

import { type PlayerRating } from './rating';
import { DIFFICULTY } from '@/games/settings';
import { expectedScore } from './rating';

export interface SelectOptions {
  /** Target success probability (default 0.8) */
  pTarget?: number;
  /** Difficulty of the previous puzzle for this game (for jump cap) */
  prevDifficulty?: number;
  /** Maximum absolute difficulty change per puzzle (default 100) */
  maxJump?: number;
  /** Exploration jitter as fraction of RD (default 0.5) */
  explorationFactor?: number;
}

/**
 * Select a difficulty that targets `pTarget` success probability for the
 * given player rating.
 *
 * Inverts expectedScore(skill, D) = pTarget:
 *   D = skill + 400 * log10((1 - pTarget) / pTarget)
 *
 * For pTarget = 0.8: D = skill - 241  (puzzle ~241 points easier than skill)
 * For pTarget = 0.5: D = skill         (head-to-head)
 * For pTarget = 0.2: D = skill + 241  (puzzle harder)
 */
export function selectDifficulty(
  rating: PlayerRating,
  options: SelectOptions = {},
): number {
  const {
    pTarget = 0.8,
    prevDifficulty,
    maxJump = 100,
    explorationFactor = 0.5,
  } = options;

  // Safeguard pTarget from edge values
  const p = Math.max(0.01, Math.min(0.99, pTarget));

  // Base difficulty from the inverted Elo formula
  const base = rating.skill + 400 * Math.log10((1 - p) / p);

  // Exploration jitter: uniform in [-explorationFactor * RD, +explorationFactor * RD]
  // When RD is high (uncertain), we explore more; when low, we exploit.
  const jitter = (Math.random() * 2 - 1) * explorationFactor * rating.rd;

  let D = base + jitter;

  // Snap to DIFFICULTY step
  D = Math.round(D / DIFFICULTY.step) * DIFFICULTY.step;

  // Clamp to allowed range
  D = Math.max(DIFFICULTY.min, Math.min(DIFFICULTY.max, D));

  // Cap per-puzzle jump to avoid wild swings
  if (prevDifficulty !== undefined) {
    const lower = prevDifficulty - maxJump;
    const upper = prevDifficulty + maxJump;
    D = Math.max(lower, Math.min(upper, D));
    // Re-snap after capping (in case the cap landed off-step)
    D = Math.round(D / DIFFICULTY.step) * DIFFICULTY.step;
    // Re-clamp to global range (in case prevDifficulty was near the edge)
    D = Math.max(DIFFICULTY.min, Math.min(DIFFICULTY.max, D));
  }

  return D;
}

/**
 * Compute the expected success probability for a given (skill, difficulty) pair.
 * Purely analytic – no jitter, no clamping.
 */
export function expectedProbability(
  skill: number,
  difficulty: number,
): number {
  return expectedScore(skill, difficulty);
}
