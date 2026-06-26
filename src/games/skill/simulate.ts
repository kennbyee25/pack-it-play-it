// MVP 0 simulation harness — the offline instrument that validates the A2 bet
// ("tunable complexity → measurable difficulty") before any real-user time.
//
// Two independent simulations:
//   1. monotonicity — run a *constant-ability* player (a bounded random solver)
//      against real generated puzzles across the difficulty range; the empirical
//      success rate must fall monotonically with D. This is the A2 kill gate.
//   2. estimator validation — a synthetic player whose true P(solve) is logistic
//      in (trueSkill − D); checks the estimator converges and predicts outcomes.

import type { PuzzleGame } from '../types';
import type { SolverSpec } from '../solvers/types';
import { randomSolver } from '../solvers/base';
import { makeRng, type Rng } from '../rng';
import { expectedScore, updateSkill, selectDifficulty, newPlayer } from './estimator';

// ---- statistics ------------------------------------------------------------

// Spearman rank correlation between two equal-length series.
export function spearman(xs: number[], ys: number[]): number {
  const rank = (a: number[]): number[] => {
    const idx = a.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array<number>(a.length);
    for (let i = 0; i < idx.length; ) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const avg = (i + j) / 2 + 1; // average rank for ties (1-based)
      for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const n = xs.length;
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
}

// Log-loss of predicted probabilities against binary outcomes (lower is better).
export function logLoss(probs: number[], outcomes: number[]): number {
  const eps = 1e-9;
  let sum = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = Math.min(1 - eps, Math.max(eps, probs[i]));
    sum += -(outcomes[i] * Math.log(p) + (1 - outcomes[i]) * Math.log(1 - p));
  }
  return sum / probs.length;
}

// ---- simulation 1: monotonicity (A2 gate) ----------------------------------

export interface MonotonicityResult {
  difficulties: number[];
  successRates: number[];
  rho: number; // Spearman(difficulty, successRate) — expect strongly negative
}

export function runMonotonicity<TState, TMove>(
  game: PuzzleGame<TState, TMove>,
  spec: SolverSpec<TState>,
  opts: {
    difficulties?: number[];
    samples?: number;
    maxIterations?: number;
    rng?: Rng;
  } = {},
): MonotonicityResult {
  const difficulties = opts.difficulties ?? [0, 300, 600, 900, 1200, 1500, 1800];
  const samples = opts.samples ?? 100;
  const maxIterations = opts.maxIterations ?? 40;
  const rng = opts.rng ?? makeRng(1);
  const solver = randomSolver(game, spec, rng);

  const successRates = difficulties.map((d) => {
    let solved = 0;
    for (let i = 0; i < samples; i++) {
      const gen = game.generate(d, makeRng(d * 1000 + i + 1));
      if (solver.solve(gen.puzzle, { maxIterations, timeoutMs: 500 }).solved) solved++;
    }
    return solved / samples;
  });

  return { difficulties, successRates, rho: spearman(difficulties, successRates) };
}

// ---- simulation 2: synthetic player → estimator validation -----------------

// A synthetic player with a fixed true skill; solves with logistic probability.
export const syntheticOutcome = (trueSkill: number, difficulty: number, rng: Rng): number =>
  rng.next() < expectedScore(trueSkill, difficulty) ? 1 : 0;

export interface ConvergenceResult {
  trueSkill: number;
  estSkill: number;
  finalRd: number;
  skillError: number;
}

// Play N puzzles selected around the running estimate; report convergence.
export function runConvergence(
  trueSkill: number,
  opts: { puzzles?: number; pStar?: number; rng?: Rng } = {},
): ConvergenceResult {
  const puzzles = opts.puzzles ?? 200;
  const pStar = opts.pStar ?? 0.5;
  const rng = opts.rng ?? makeRng(7);
  let est = newPlayer();
  for (let i = 0; i < puzzles; i++) {
    const d = selectDifficulty(est.skill, pStar);
    const score = syntheticOutcome(trueSkill, d, rng);
    est = updateSkill(est, d, score);
  }
  return {
    trueSkill,
    estSkill: est.skill,
    finalRd: est.rd,
    skillError: Math.abs(est.skill - trueSkill),
  };
}
