// MVP 2 — multi-game common scale.
// Each game's native difficulty knob produces a different success curve for the
// reference player (see the A2 monotonicity data). To compare skill across games
// we put them on ONE normalized scale: we measure each game's success curve, then
// invert it so a normalized difficulty D maps to the native difficulty at which the
// reference player achieves the SAME expected success in every game.

import type { PuzzleGame } from '../types';
import type { SolverSpec } from '../solvers/types';
import { randomSolver } from '../solvers/base';
import { makeRng, type Rng } from '../rng';
import { expectedScore } from './estimator';

// The reference player's skill defines what a normalized difficulty "means":
// target success at normalized D is expectedScore(REF_SKILL, D).
export const REF_SKILL = 1000;

// Reference player = bounded random solver. Same budget across games ⇒ comparable.
export const REF = { maxIterations: 40, timeoutMs: 500, samples: 120 } as const;

export interface SuccessCurve {
  gameId: string;
  nativeDs: number[]; // ascending native difficulties
  rates: number[]; // reference-player success rate at each (monotone decreasing)
}

// Measure the reference player's success rate across native difficulties.
export function measureCurve<TState, TMove>(
  game: PuzzleGame<TState, TMove>,
  spec: SolverSpec<TState>,
  opts: { nativeDs?: number[]; samples?: number; rng?: Rng } = {},
): SuccessCurve {
  const nativeDs =
    opts.nativeDs ?? Array.from({ length: 17 }, (_, i) => 100 + i * 150); // 100..2500, step 150
  const samples = opts.samples ?? REF.samples;
  const solver = randomSolver(game, spec, opts.rng ?? makeRng(1));
  const rates = nativeDs.map((d) => {
    let solved = 0;
    for (let i = 0; i < samples; i++) {
      const gen = game.generate(d, makeRng(d * 10007 + i + 1));
      if (solver.solve(gen.puzzle, { maxIterations: REF.maxIterations, timeoutMs: REF.timeoutMs }).solved)
        solved++;
    }
    return solved / samples;
  });
  return { gameId: game.id, nativeDs, rates };
}

// Invert a (decreasing) success curve: native difficulty achieving `targetRate`.
// Linear interpolation between the bracketing samples; clamps past the ends.
export function nativeForRate(curve: SuccessCurve, targetRate: number): number {
  const { nativeDs, rates } = curve;
  // rates descend with nativeD. Find the bracket where rate crosses target.
  for (let i = 0; i < rates.length - 1; i++) {
    const hi = rates[i];
    const lo = rates[i + 1];
    if (targetRate <= hi && targetRate >= lo) {
      const span = hi - lo;
      const t = span === 0 ? 0 : (hi - targetRate) / span;
      return nativeDs[i] + t * (nativeDs[i + 1] - nativeDs[i]);
    }
  }
  // Target above the easiest rate ⇒ easiest D; below the hardest ⇒ hardest D.
  return targetRate >= rates[0] ? nativeDs[0] : nativeDs[nativeDs.length - 1];
}

export type Calibration = Record<string, SuccessCurve>;

// Build calibration for a set of games (their measured curves).
export function buildCalibration(
  games: { game: PuzzleGame<any, any>; spec: SolverSpec<any> }[], // eslint-disable-line @typescript-eslint/no-explicit-any
  opts: { nativeDs?: number[]; samples?: number; rng?: Rng } = {},
): Calibration {
  const cal: Calibration = {};
  for (const { game, spec } of games) cal[game.id] = measureCurve(game, spec, opts);
  return cal;
}

// Map a normalized difficulty D (Elo scale) to a game's native difficulty so the
// reference player's expected success matches expectedScore(REF_SKILL, D) in every game.
export function calibratedNativeDifficulty(cal: Calibration, gameId: string, normalizedD: number): number {
  const curve = cal[gameId];
  if (!curve) return normalizedD; // uncalibrated game: pass through
  return nativeForRate(curve, expectedScore(REF_SKILL, normalizedD));
}
