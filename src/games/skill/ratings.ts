// Per-game Glicko-lite ratings — the player's skill estimate for each game,
// persisted across sessions. Mirrors settings.ts in shape. Pure store ops; the
// estimator math lives in estimator.ts.

import { type SkillEstimate, newPlayer, updateSkill } from './estimator';

// Keyed by game id. A missing game falls back to a fresh player.
export type Ratings = Record<string, SkillEstimate>;

export const getRating = (ratings: Ratings, gameId: string): SkillEstimate =>
  ratings[gameId] ?? newPlayer();

// Record one attempt's outcome (score ∈ [0,1]) against the difficulty served, and
// return updated ratings (immutable).
export function recordOutcome(
  ratings: Ratings,
  gameId: string,
  difficulty: number,
  score: number,
): Ratings {
  return { ...ratings, [gameId]: updateSkill(getRating(ratings, gameId), difficulty, score) };
}

export const serialize = (ratings: Ratings): string => JSON.stringify(ratings);

// Tolerant parse: garbage → empty (callers fall back to fresh players per game).
export function parse(json: string | null): Ratings {
  if (!json) return {};
  try {
    const v = JSON.parse(json);
    if (!v || typeof v !== 'object') return {};
    const out: Ratings = {};
    for (const [id, r] of Object.entries(v)) {
      if (r && typeof (r as SkillEstimate).skill === 'number' && typeof (r as SkillEstimate).rd === 'number') {
        out[id] = { skill: (r as SkillEstimate).skill, rd: (r as SkillEstimate).rd };
      }
    }
    return out;
  } catch {
    return {};
  }
}
