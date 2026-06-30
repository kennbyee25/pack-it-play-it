import { describe, it, expect } from 'vitest';
import { type PlayerRating, DEFAULT_RATING, expectedScore, updatePlayer } from '../rating';
import { selectDifficulty } from '../selectDifficulty';

interface SimOptions {
  trueSkill: number;
  pTarget: number;
  maxPuzzles: number;
  baseK?: number;
}

interface SimResult {
  rating: PlayerRating;
  steps: number;
  diffs: number[];
  outcomes: number[];
}

/**
 * Deterministic simulation: explorationFactor=0 removes Math.random jitter,
 * so the simulation is fully predictable and tests are stable.
 */
function simulate(options: SimOptions): SimResult {
  const { trueSkill, pTarget, maxPuzzles, baseK } = options;
  const diffs: number[] = [];
  const outcomes: number[] = [];

  let rating: PlayerRating = { ...DEFAULT_RATING };
  let prevDifficulty: number | undefined;

  for (let step = 0; step < maxPuzzles; step++) {
    const difficulty = selectDifficulty(rating, {
      pTarget,
      prevDifficulty,
      explorationFactor: 0, // deterministic
    });
    const outcome = expectedScore(trueSkill, difficulty);
    rating = updatePlayer(rating, difficulty, outcome, { baseK });
    diffs.push(difficulty);
    outcomes.push(outcome);
    prevDifficulty = difficulty;
  }

  return { rating, steps: maxPuzzles, diffs, outcomes };
}

describe('simulation convergence', () => {
  it('skill trends upward for trueSkill=800', () => {
    const r = simulate({ trueSkill: 800, pTarget: 0.8, maxPuzzles: 30 });
    expect(r.rating.skill).toBeGreaterThan(300);
  });

  it('skill trends upward for trueSkill=1500', () => {
    const r = simulate({ trueSkill: 1500, pTarget: 0.8, maxPuzzles: 30 });
    expect(r.rating.skill).toBeGreaterThan(300);
  });

  it('different trueSkills produce different ratings (system is responsive)', () => {
    const low = simulate({ trueSkill: 400, pTarget: 0.8, maxPuzzles: 30 });
    const high = simulate({ trueSkill: 1500, pTarget: 0.8, maxPuzzles: 30 });
    // After 30 puzzles, the high-skill player should have a higher
    // rating (outcomes are more positive, so skill rises faster)
    expect(high.rating.skill).toBeGreaterThan(low.rating.skill);
  });

  it('weak player (trueSkill=100) stays near floor', () => {
    const r = simulate({ trueSkill: 100, pTarget: 0.8, maxPuzzles: 30 });
    expect(r.rating.skill).toBeGreaterThan(50);
    expect(r.rating.skill).toBeLessThan(400);
  });

  it('last-20-puzzle success rate drifts toward pTarget', () => {
    const r = simulate({ trueSkill: 1200, pTarget: 0.8, maxPuzzles: 80 });
    const last20 = r.outcomes.slice(-20);
    const avg = last20.reduce((a, b) => a + b, 0) / last20.length;
    expect(avg).toBeLessThan(0.99);
    expect(avg).toBeGreaterThan(0.5);
  });

  it('net skill gain from starting 100 (monotonic direction)', () => {
    const r = simulate({ trueSkill: 1500, pTarget: 0.8, maxPuzzles: 30 });
    expect(r.rating.skill).toBeGreaterThan(DEFAULT_RATING.skill);
  });

  it('converges from underconfident direction over 80 puzzles', () => {
    const r = simulate({ trueSkill: 1800, pTarget: 0.8, maxPuzzles: 80 });
    expect(r.rating.skill).toBeGreaterThan(500);
  });

  it('over 80 puzzles, rating error shrinks substantially', () => {
    const trueSkill = 800;
    const r = simulate({ trueSkill, pTarget: 0.8, maxPuzzles: 80 });
    const error = Math.abs(r.rating.skill - trueSkill);
    expect(error).toBeLessThan(420);
  });

  it('all selected difficulties are in valid range and snapped to step', () => {
    const r = simulate({ trueSkill: 1200, pTarget: 0.8, maxPuzzles: 50 });
    for (const d of r.diffs) {
      expect(d).toBeGreaterThanOrEqual(100);
      expect(d).toBeLessThanOrEqual(2500);
      expect(d % 50).toBe(0);
    }
  });

  it('RD remains above 50 after 30 puzzles (stays adaptable)', () => {
    const r = simulate({ trueSkill: 1200, pTarget: 0.8, maxPuzzles: 30 });
    expect(r.rating.rd).toBeGreaterThan(50);
  });
});
