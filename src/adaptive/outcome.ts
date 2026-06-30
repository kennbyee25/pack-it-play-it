// Outcome scoring function: maps a solved attempt to a scalar in [0,1]
// Combines solved?, time efficiency, move efficiency, hint penalty.

export interface SolveMetrics {
  /** Number of moves the player actually made */
  moves: number;
  /** Length of the planted solution (optimal moves, no wasted moves) */
  optimalMoves: number;
  /** Time to solve in seconds */
  seconds: number;
  /** Number of hints or resets used */
  hintsUsed: number;
}

/** Default weights for outcome components; sum should be <= 1 (we'll normalize) */
export const DEFAULT_OUTCOME_WEIGHTS = {
  solved: 0.5,
  time: 0.2,
  moves: 0.2,
  hints: 0.1,
} as const;

/**
 * Compute timeScore: how close actual time is to expected time for given difficulty.
 * Expected time increases with difficulty (harder puzzles take longer).
 * We'll use a simple linear mapping: expectedTime = baseTime * (D / midDifficulty)
 * where baseTime is expected time at mid difficulty.
 * For simplicity we treat timeScore = clamp(expected / actual, 0, 2) / 2
 * so that perfect time gives 1, half time gives 1, double time gives 0.5, etc.
 */
function timeScore(actualSeconds: number, expectedSeconds: number): number {
  if (actualSeconds === 0) return 2; // extremely fast -> max
  const ratio = expectedSeconds / actualSeconds;
  // clamp ratio to [0,2] then map to [0,1]
  const clamped = Math.min(2, Math.max(0, ratio));
  return clamped / 2;
}

/**
 * Compute moveScore: optimalMoves / actualMoves, capped at 1 (cannot exceed optimal)
 */
function moveScore(actualMoves: number, optimalMoves: number): number {
  if (actualMoves === 0) return 0;
  const ratio = optimalMoves / actualMoves;
  return Math.min(1, ratio);
}

/**
 * Compute hintPenalty: each hint reduces score linearly; we map to [0,1]
 * assuming maxHintPenalty hints yields zero.
 */
function hintScore(hintsUsed: number, maxHintPenalty: number = 5): number {
  // linear decay: 0 hints -> 1, maxHintPenalty hints -> 0
  return Math.max(0, 1 - hintsUsed / maxHintPenalty);
}

/**
 * Compute overall outcome score in [0,1].
 * @param solved whether puzzle was solved
 * @param metrics solve metrics
 * @param difficulty puzzle difficulty (used to compute expected time)
 * @param weights optional weights; defaults to DEFAULT_OUTCOME_WEIGHTS
 * @returns score between 0 and 1
 */
export function computeOutcome(
  solved: boolean,
  metrics: SolveMetrics,
  difficulty: number,
  weights = DEFAULT_OUTCOME_WEIGHTS
): number {
  if (!solved) {
    // If not solved, outcome is based only on effort? We'll give a small base.
    // Could also be zero; but we want some signal for learning.
    // We'll compute effort components but zero out solved component.
    const base =
      weights.time * timeScore(metrics.seconds, expectedTime(difficulty)) +
      weights.moves * moveScore(metrics.moves, metrics.optimalMoves) +
      weights.hints * hintScore(metrics.hintsUsed);
    return base;
  }

  const expected = expectedTime(difficulty);
  const tScore = timeScore(metrics.seconds, expected);
  const mScore = moveScore(metrics.moves, metrics.optimalMoves);
  const hScore = hintScore(metrics.hintsUsed);

  const score =
    weights.solved * 1 +
    weights.time * tScore +
    weights.moves * mScore +
    weights.hints * hScore;

  // Ensure score does not exceed 1 (if weights sum >1 we clamp)
  return Math.min(1, score);
}

/**
 * Expected time to solve a puzzle of given difficulty.
 * Simple linear mapping: difficulty 100 -> 30s, difficulty 2500 -> 120s.
 * Adjust as needed.
 */
function expectedTime(D: number): number {
  const minDiff = 100;
  const maxDiff = 2500;
  const minTime = 20; // seconds at easiest
  const maxTime = 120; // seconds at hardest
  // Clamp D to range
  const clamped = Math.min(maxDiff, Math.max(minDiff, D));
  const frac = (clamped - minDiff) / (maxDiff - minDiff);
  return minTime + frac * (maxTime - minTime);
}