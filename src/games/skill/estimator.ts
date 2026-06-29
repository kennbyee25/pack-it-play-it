// MVP 0 — measurable difficulty & skill.
// An Elo/Glicko-lite skill model on the same continuous scale as difficulty D.
// Pure functions, parameterized constants — no hidden state.

export const ELO = {
  scale: 400, // Elo logistic scale: a `scale`-point edge ⇒ ~76% expected score
  startSkill: 600, // a fresh player's prior skill (mid of the ~0..2400 D range)
  startRd: 400, // initial rating deviation (uncertainty), Glicko-style
  minRd: 80, // RD floor — we never become infinitely certain
  rdDecay: 0.985, // RD shrinks toward the floor as evidence accrues
  kFromRd: 0.08, // learning-rate per RD point (K = kFromRd * rd)
} as const;

export interface SkillEstimate {
  skill: number;
  rd: number; // rating deviation: how uncertain we are
}

export const newPlayer = (skill: number = ELO.startSkill, rd: number = ELO.startRd): SkillEstimate => ({
  skill,
  rd,
});

// Logistic expected score (probability-like) that a player of `skill` solves a
// puzzle of rating `difficulty`. Monotonic decreasing in difficulty.
export function expectedScore(skill: number, difficulty: number): number {
  return 1 / (1 + 10 ** ((difficulty - skill) / ELO.scale));
}

// Update the estimate after one outcome (score ∈ [0,1]) on a puzzle of `difficulty`.
// Larger RD ⇒ bigger step (we trust new evidence more when uncertain); RD then shrinks.
export function updateSkill(est: SkillEstimate, difficulty: number, score: number): SkillEstimate {
  const expected = expectedScore(est.skill, difficulty);
  const k = ELO.kFromRd * est.rd;
  const skill = est.skill + k * (score - expected);
  const rd = Math.max(ELO.minRd, est.rd * ELO.rdDecay);
  return { skill, rd };
}

// Invert expectedScore: the difficulty D* at which this skill is expected to score p*.
// D* = skill + scale * log10((1 - p*) / p*).  (p*=0.5 ⇒ D*=skill.)
export function selectDifficulty(skill: number, pStar: number): number {
  const p = Math.min(0.999, Math.max(0.001, pStar));
  return skill + ELO.scale * Math.log10((1 - p) / p);
}
