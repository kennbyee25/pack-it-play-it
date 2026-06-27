import { describe, it, expect } from 'vitest';
import { makeRng } from '../rng';
import { getGameSolvers } from '../solvers/registry';
import { randomSolver } from '../solvers/base';
import {
  measureCurve,
  nativeForRate,
  buildCalibration,
  calibratedNativeDifficulty,
  REF,
  REF_SKILL,
  type SuccessCurve,
} from './calibration';
import { expectedScore, selectDifficulty, updateSkill, newPlayer } from './estimator';
import { syntheticOutcome, spearman } from './simulate';

// Games with cleanly monotonic curves spanning the target band (from A2 data).
const CALIBRATABLE = ['set-cover', 'subset-sum', 'vertex-cover', 'independent-set', 'exact-cover', '3d-matching'];

describe('nativeForRate (curve inversion)', () => {
  const curve: SuccessCurve = { gameId: 't', nativeDs: [0, 100, 200], rates: [1, 0.5, 0] };
  it('interpolates between samples', () => {
    expect(nativeForRate(curve, 0.75)).toBeCloseTo(50, 6);
    expect(nativeForRate(curve, 0.25)).toBeCloseTo(150, 6);
  });
  it('clamps past the ends', () => {
    expect(nativeForRate(curve, 1.2)).toBe(0); // easier than easiest ⇒ easiest D
    expect(nativeForRate(curve, -0.2)).toBe(200); // harder than hardest ⇒ hardest D
  });
});

describe('measured curves are monotone decreasing and span the target band', () => {
  // Monotonicity is a global property — at a fine grid, adjacent points wobble with
  // sampling noise, so we check Spearman(nativeD, rate) and the overall span.
  it.each(CALIBRATABLE)('%s', (id) => {
    const { game, spec } = getGameSolvers(id)!;
    const c = measureCurve(game, spec, { samples: 100, rng: makeRng(1) });
    expect(spearman(c.nativeDs, c.rates)).toBeLessThanOrEqual(-0.85);
    expect(c.rates[0] - c.rates[c.rates.length - 1]).toBeGreaterThan(0.5); // wide range
  });
});

describe('MVP2 — calibrated cross-game equivalence', () => {
  it('same normalized difficulty ⇒ same reference success across games (±0.15)', () => {
    const games = CALIBRATABLE.map((id) => getGameSolvers(id)!);
    const cal = buildCalibration(games, { samples: 120, rng: makeRng(1) });

    // Normalized difficulties → target success via the reference skill.
    for (const normalizedD of [800, 1000, 1200]) {
      const target = expectedScore(REF_SKILL, normalizedD);
      const realized: number[] = [];
      for (const { game, spec } of games) {
        const nativeD = calibratedNativeDifficulty(cal, game.id, normalizedD);
        // Re-measure success at the calibrated native difficulty with a fresh seed.
        const solver = randomSolver(game, spec, makeRng(99));
        let solved = 0;
        const n = 120;
        for (let i = 0; i < n; i++) {
          const gen = game.generate(nativeD, makeRng(i * 31 + 5));
          if (solver.solve(gen.puzzle, { maxIterations: REF.maxIterations, timeoutMs: REF.timeoutMs }).solved)
            solved++;
        }
        const rate = solved / n;
        realized.push(rate);
        expect(Math.abs(rate - target)).toBeLessThan(0.15); // each game hits the target
      }
      // And the games agree with each other.
      expect(Math.max(...realized) - Math.min(...realized)).toBeLessThan(0.22);
    }
  }, 60000);
});

describe('MVP2 — per-game skill independence', () => {
  it('estimates distinct skills for a player strong at A, weak at B', () => {
    const rng = makeRng(7);
    // Player: strong at set-cover (true 1400), weak at vertex-cover (true 500).
    const trueSkill = { 'set-cover': 1400, 'vertex-cover': 500 };
    const estimates: Record<string, number> = {};
    for (const [id, truth] of Object.entries(trueSkill)) {
      let est = newPlayer();
      for (let i = 0; i < 300; i++) {
        const d = selectDifficulty(est.skill, 0.5); // normalized scale
        est = updateSkill(est, d, syntheticOutcome(truth, d, rng));
      }
      estimates[id] = est.skill;
    }
    expect(estimates['set-cover']).toBeGreaterThan(estimates['vertex-cover'] + 400);
  });
});
