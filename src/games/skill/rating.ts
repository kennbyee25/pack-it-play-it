// Stage-1 Glicko-lite rating system.
// Per-game rating: skill on DIFFICULTY scale (100–2500), RD for uncertainty.
// Rating updates use Elo expected-score with RD-scaled K-factor.

export interface PlayerRating {
  /** Estimated skill on the same scale as difficulty (100–2500) */
  skill: number;
  /** Rating deviation – higher = less certain, larger updates */
  rd: number;
  /** Number of rated games played (debugging + reference) */
  games: number;
}

/** Default rating for a brand new game (no history). */
export const DEFAULT_RATING: PlayerRating = {
  skill: 100,
  rd: 350,
  games: 0,
};

/**
 * Expected score (probability of solving) for a player with skill `skill`
 * against a puzzle of difficulty `difficulty`.
 *
 * Standard Elo logistic: 1 / (1 + 10^((D - skill) / 400))
 *   skill > D → E > 0.5  (puzzle is easy relative to player)
 *   skill < D → E < 0.5  (puzzle is hard)
 */
export function expectedScore(skill: number, difficulty: number): number {
  return 1 / (1 + Math.pow(10, (difficulty - skill) / 400));
}

/**
 * Update a player's rating after playing a puzzle.
 *
 * @param rating  Current rating before the game
 * @param difficulty  Difficulty of the puzzle that was played (D)
 * @param outcome  Actual score in [0, 1]:
 *   1.0 = perfect solve, 0.5 = partial, 0.0 = skip / fail
 * @param config  Optional tuning parameters
 */
export function updatePlayer(
  rating: PlayerRating,
  difficulty: number,
  outcome: number,
  config?: {
    /** Base K when RD = initialRd (default 64 — double standard Elo for faster
     *  convergence from the low starting skill of 100) */
    baseK?: number;
    /** RD at which K = baseK (default 350 — matches initial RD) */
    initialRd?: number;
    /** RD multiplier per game (default 0.99 — slower decay than standard
     *  Glicko so the rating stays adaptable longer given the wide
     *  difficulty range and low starting skill) */
    rdDecay?: number;
    /** Minimum RD floor (default 30) */
    rdFloor?: number;
  },
): PlayerRating {
  const o = Math.max(0, Math.min(1, outcome));
  const E = expectedScore(rating.skill, difficulty);
  const initialRd = config?.initialRd ?? 350;
  const baseK = config?.baseK ?? 64;
  const K = baseK * (rating.rd / initialRd);
  const delta = K * (o - E);
  const newSkill = rating.skill + delta;

  const rdDecay = config?.rdDecay ?? 0.99;
  const rdFloor = config?.rdFloor ?? 30;
  const newRd = Math.max(rdFloor, rating.rd * rdDecay);

  return {
    skill: newSkill,
    rd: newRd,
    games: rating.games + 1,
  };
}

/**
 * Update rating without a game outcome — just tick the RD down.
 * Useful when the player didn't actually attempt the puzzle.
 */
export function decayRating(
  rating: PlayerRating,
  config?: { rdDecay?: number; rdFloor?: number },
): PlayerRating {
  const rdDecay = config?.rdDecay ?? 0.99;
  const rdFloor = config?.rdFloor ?? 30;
  return {
    ...rating,
    rd: Math.max(rdFloor, rating.rd * rdDecay),
    games: rating.games + 1,
  };
}
