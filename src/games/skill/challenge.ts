// Optimal Challenge Point (OCP) selection — pick the next difficulty for a game so
// the player's *expected* success sits in the functional-difficulty band. Grounded
// in the Challenge Point Framework (docs/research/optimal-challenge-point.md):
// target a high-but-not-certain success (~75–85%), not 50%, and treat the target as
// a *band/distribution* (rd-scaled jitter), not a single point.

import { clampDifficulty } from '../settings';
import { selectDifficulty, type SkillEstimate } from './estimator';
import type { Rng } from '../rng';

export const OCP = {
  target: 0.8, // target success probability (flow band center, 75–85%)
  // Band width: difficulty jitter amplitude = jitterFromRd * rd. Wider when we're
  // less sure of the player's skill, so the ladder explores instead of locking in.
  jitterFromRd: 0.5,
} as const;

// The next difficulty to serve for a game given the player's rating. With an rng,
// adds a confidence-scaled jitter so OCP is a band, not a point; deterministic
// (no jitter) when rng is omitted — used by e2e/replay.
export function selectChallenge(
  rating: SkillEstimate,
  rng?: Rng,
  target: number = OCP.target,
): number {
  const base = selectDifficulty(rating.skill, target);
  const amp = OCP.jitterFromRd * rating.rd;
  const jitter = rng ? (rng.next() * 2 - 1) * amp : 0;
  return clampDifficulty(base + jitter);
}
