import { describe, it, expect } from 'vitest';
import { makeRng } from '../rng';
import { getGameSolvers } from '../solvers/registry';
import { expectedScore, selectDifficulty, updateSkill, newPlayer } from './estimator';
import { scoreOutcome } from './scorer';
import { spearman, logLoss, runMonotonicity, runConvergence, syntheticOutcome } from './simulate';

// Baseline log-loss of always predicting 0.5.
const BASELINE_LOGLOSS = -Math.log(0.5); // ≈ 0.693

describe('estimator math', () => {
  it('expectedScore is monotonic decreasing in difficulty and 0.5 at parity', () => {
    expect(expectedScore(600, 600)).toBeCloseTo(0.5, 6);
    expect(expectedScore(600, 200)).toBeGreaterThan(expectedScore(600, 600));
    expect(expectedScore(600, 1000)).toBeLessThan(expectedScore(600, 600));
  });

  // Story: Difficulty inversion — solving for D* hits the target success p*.
  it.each([0.3, 0.5, 0.7, 0.85])('selectDifficulty inverts expectedScore for p*=%s', (pStar) => {
    const skill = 800;
    const dStar = selectDifficulty(skill, pStar);
    expect(expectedScore(skill, dStar)).toBeCloseTo(pStar, 6);
  });
});

describe('outcome scorer', () => {
  it('unsolved scores 0; fast clean solve scores high; slow wasteful solve scores lower', () => {
    expect(scoreOutcome({ solved: false, seconds: 5, moves: 3, optimalMoves: 3 })).toBe(0);
    const clean = scoreOutcome({ solved: true, seconds: 10, moves: 4, optimalMoves: 4 });
    const messy = scoreOutcome({ solved: true, seconds: 120, moves: 20, optimalMoves: 4 });
    expect(clean).toBeGreaterThan(0.9);
    expect(clean).toBeGreaterThan(messy);
    expect(messy).toBeGreaterThanOrEqual(0.6); // a solve is always worth solveBase
  });
});

describe('spearman', () => {
  it('is +1 / −1 for monotonic series', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 6);
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 6);
  });
});

// Story + KILL CRITERION: difficulty must be monotonic with empirical success.
// The bounded random solver is a constant-ability player; success must fall with D.
describe('A2 gate — monotonic difficulty (constant-ability solver vs real generators)', () => {
  it.each(['set-cover', 'subset-sum'])('%s: success strongly decreases with difficulty', (id) => {
    const { game, spec } = getGameSolvers(id)!;
    const res = runMonotonicity(game, spec, { samples: 80, rng: makeRng(1) });
    // Kill criterion: |rho| >= 0.7 AND negative (harder ⇒ less success).
    expect(res.rho).toBeLessThanOrEqual(-0.7);
  });

  it('three-sat is flagged (known weak knob), still measured', () => {
    const { game, spec } = getGameSolvers('three-sat')!;
    const res = runMonotonicity(game, spec, { samples: 80, rng: makeRng(1) });
    // We only assert the instrument produces a finite correlation; 3-SAT's knob is
    // weak for a random solver (high model density) — documented in MVP0 notes.
    expect(Number.isFinite(res.rho)).toBe(true);
    expect(res.successRates[0]).toBeGreaterThanOrEqual(res.successRates.at(-1)!);
  });
});

// Story: skill estimate converges to true skill and RD shrinks.
describe('estimator convergence', () => {
  it.each([300, 600, 1000, 1400])('converges near true skill %i with shrinking RD', (trueSkill) => {
    const res = runConvergence(trueSkill, { puzzles: 400, pStar: 0.5, rng: makeRng(trueSkill + 1) });
    expect(res.skillError).toBeLessThan(120); // within ~0.3 of the Elo scale
    expect(res.finalRd).toBeLessThan(newPlayer().rd); // uncertainty decreased
  });
});

// Story: calibrated estimate predicts outcomes better than a 0.5 baseline.
describe('estimator predicts outcomes (beats 0.5 baseline log-loss)', () => {
  it('lower log-loss than always-0.5', () => {
    const trueSkill = 900;
    const rng = makeRng(123);
    // Calibrate an estimate by letting it converge first.
    let est = newPlayer();
    for (let i = 0; i < 300; i++) {
      const d = selectDifficulty(est.skill, 0.5);
      est = updateSkill(est, d, syntheticOutcome(trueSkill, d, rng));
    }
    // Now predict a fresh batch at varied difficulties.
    const probs: number[] = [];
    const outcomes: number[] = [];
    for (const d of [400, 700, 900, 1100, 1400]) {
      for (let i = 0; i < 60; i++) {
        probs.push(expectedScore(est.skill, d));
        outcomes.push(syntheticOutcome(trueSkill, d, rng));
      }
    }
    expect(logLoss(probs, outcomes)).toBeLessThan(BASELINE_LOGLOSS);
  });
});
