// Simple Glicko-lite rating system: Elo with RD-based K-factor and RD decay.

export interface PlayerRating {
  /** Estimated skill on same scale as difficulty (100-2500) */
  skill: number;
  /** Rating deviation (uncertainty); higher => less certainty */
  rd: number;
  /** Number of games played (for debugging) */
  games: number;
}

/** Default rating for new players */
export const DEFAULT_RATING: PlayerRating = {
  skill: 1300, // midpoint of range 100-2500
  rd: 300, // high uncertainty
  games: 0,
};

/**
 * Expected score (probability of winning) for player with given skill
 * against opponent (or puzzle) with rating D.
 * Uses logistic curve with scaling factor 400 (like Elo).
 */
export function expectedScore(playerSkill: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerSkill) / 400));
}

/**
 * Update player rating after a game.
 * @param player current rating
 * @param opponentRating difficulty of the puzzle just played
 * @param outcome actual score in [0,1] (1 = win, 0 = loss, 0.5 = draw)
 * @returns new rating
 */
export function updatePlayer(
  player: PlayerRating,
  opponentRating: number,
  outcome: number
): PlayerRating {
  // Ensure outcome is clamped
  const o = Math.max(0, Math.min(1, outcome));
  const E = expectedScore(player.skill, opponentRating);
  // K-factor scales with RD: higher uncertainty => larger updates
  // Base K = 32 (standard Elo)
  const K = 32 * (player.rd / 300); // scale relative to initial RD 300
  const delta = K * (o - E);
  const newSkill = player.skill + delta;

  // RD decreases with experience, but never below a floor
  // Simple decay: multiply by factor <1 each game, asymptotic to rdFloor
  const rdFactor = 0.97; // each game reduces RD by 3%
  const rdFloor = 30; // minimum uncertainty
  const newRd = Math.max(rdFloor, player.rd * rdFactor);

  return {
    skill: newSkill,
    rd: newRd,
    games: player.games + 1,
  };
}

/**
 * Update rating after a series of games (optional batch).
 * Not needed for online update but kept for completeness.
 */
export function updateBatch(
  player: PlayerRating,
  opponentRatings: number[],
  outcomes: number[]
): PlayerRating {
  let acc = player;
  for (let i = 0; i < opponentRatings.length; i++) {
    acc = updatePlayer(acc, opponentRatings[i], outcomes[i]);
  }
  return acc;
}