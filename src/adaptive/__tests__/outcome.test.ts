import { describe, it, expect } from 'vitest';
import { SolveMetrics, computeOutcome } from '../outcome';

// Helper to compute expected time for a given difficulty (same as in outcome.ts)
function expectedTime(D: number): number {
  const minDiff = 100;
  const maxDiff = 2500;
  const minTime = 20; // seconds at easiest
  const maxTime = 120; // seconds at hardest
  // Clamp D to range
  const clamped = Math.min(maxDiff, Math.max(minDiff, D));
  const frac = (clamped - minDiff) / (maxDiff - minDiff);
  return minTime + frac * (maxTime - minTime);
}

describe('computeOutcome', () => {
  it('returns 0 for unsolved puzzle', () => {
    // Unsolved is zero regardless of metrics
    expect(computeOutcome(false, {} as SolveMetrics, 100)).toEqual(0);
  });

  it('returns 1 for perfect metrics at difficulty 1060 (where expected time is 60s)', () => {
    const difficulty = 1060;
    const expected = expectedTime(difficulty); // 60
    const metrics: SolveMetrics = {
      moves: 5,
      optimalMoves: 5,
      seconds: expected,
      hintsUsed: 0,
    };
    const outcome = computeOutcome(true, metrics, difficulty);
    // For perfect: solved=1, timeScore=1, moveScore=1, hintScore=1
    // outcome = 0.5*1 + 0.2*1 + 0.2*1 + 0.1*1 = 1.0
    expect(outcome).toBeCloseTo(1.0);
  });

  it('returns expected value for imperfect metrics at difficulty 1060', () => {
    const difficulty = 1060;
    const expected = expectedTime(difficulty); // 60
    const metrics: SolveMetrics = {
      moves: 10, // took twice as many moves as optimal
      optimalMoves: 5,
      seconds: 120, // 2 * expected (120s)
      hintsUsed: 2,
    };
    // timeScore: actual=120, expected=60 -> ratio=2 -> timeScore=0.5
    // moveScore: optimal/actual = 5/10 = 0.5
    // hintScore: 1 - 2/5 = 0.6
    // outcome = 0.5*1 + 0.2*0.5 + 0.2*0.5 + 0.1*0.6 = 0.5 + 0.1 + 0.1 + 0.06 = 0.76
    const outcome = computeOutcome(true, metrics, difficulty);
    expect(outcome).toBeCloseTo(0.76);
  });
});
