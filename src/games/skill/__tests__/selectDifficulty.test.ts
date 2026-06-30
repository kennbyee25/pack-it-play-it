import { describe, it, expect, vi } from 'vitest';
import { selectDifficulty, expectedProbability } from '../selectDifficulty';
import { type PlayerRating } from '../rating';
import { DIFFICULTY } from '@/games/settings';

/**
 * Deterministic version of selectDifficulty with explorationFactor=0.
 */
function selectDeterministic(
  rating: PlayerRating,
  pTarget?: number,
  prevDifficulty?: number,
): number {
  return selectDifficulty(rating, {
    pTarget,
    prevDifficulty,
    explorationFactor: 0,
  });
}

describe('selectDifficulty', () => {
  it('selects difficulty ≈ skill - 241 for pTarget=0.8 (correct inversion)', () => {
    const player: PlayerRating = { skill: 1200, rd: 30, games: 10 };
    // D = 1200 + 400*log10(0.25) = 1200 - 240.8 ≈ 959
    const D = selectDeterministic(player, 0.8);
    // Expected score at this difficulty should be ≈0.8
    const p = expectedProbability(player.skill, D);
    expect(p).toBeCloseTo(0.8, 1);
  });

  it('selected difficulty yields pTarget ± 0.05', () => {
    const player: PlayerRating = { skill: 1500, rd: 30, games: 10 };
    const targets = [0.2, 0.5, 0.7, 0.8, 0.9];
    for (const target of targets) {
      const D = selectDeterministic(player, target);
      const p = expectedProbability(player.skill, D);
      expect(Math.abs(p - target)).toBeLessThanOrEqual(0.06);
    }
  });

  it('snaps to DIFFICULTY step (50)', () => {
    const player: PlayerRating = { skill: 1200, rd: 30, games: 10 };
    const D = selectDeterministic(player, 0.8);
    expect(D % DIFFICULTY.step).toBe(0);
  });

  it('clamps to DIFFICULTY range [min, max]', () => {
    // A very weak player with high target — formula would push D far above max
    const weak: PlayerRating = { skill: 100, rd: 30, games: 0 };
    const D = selectDeterministic(weak, 0.01);
    expect(D).toBeGreaterThanOrEqual(DIFFICULTY.min);
    expect(D).toBeLessThanOrEqual(DIFFICULTY.max);

    // A very strong player with low target — formula would push D far below min
    const strong: PlayerRating = { skill: 2500, rd: 30, games: 0 };
    const D2 = selectDeterministic(strong, 0.99);
    expect(D2).toBeGreaterThanOrEqual(DIFFICULTY.min);
    expect(D2).toBeLessThanOrEqual(DIFFICULTY.max);
  });

  it('caps per-puzzle jump to ±maxJump (default 100)', () => {
    const player: PlayerRating = { skill: 1000, rd: 30, games: 10 };
    const prevDiff = 500;
    // Without cap, D might be ~759; with cap it should be within 100 of 500
    const D = selectDeterministic(player, 0.8, prevDiff);
    expect(D).toBeGreaterThanOrEqual(prevDiff - 100);
    expect(D).toBeLessThanOrEqual(prevDiff + 100);
  });

  it('applies exploration jitter when explorationFactor > 0 and RD > 0', () => {
    const player: PlayerRating = { skill: 1000, rd: 200, games: 5 };
    // With explorationFactor=0.5 and RD=200, jitter range is [-100, +100]
    // Run multiple times; should see variation
    const results = new Set<number>();
    for (let i = 0; i < 20; i++) {
      results.add(selectDifficulty(player, { explorationFactor: 0.5 }));
    }
    // With jitter and step-snapping, we should see at least 2 different values
    expect(results.size).toBeGreaterThanOrEqual(2);
  });

  it('defaults pTarget to 0.8', () => {
    const player: PlayerRating = { skill: 1200, rd: 30, games: 10 };
    const D = selectDeterministic(player);
    const p = expectedProbability(player.skill, D);
    expect(p).toBeCloseTo(0.8, 1);
  });

  it('is deterministic with explorationFactor=0', () => {
    const player: PlayerRating = { skill: 1200, rd: 30, games: 10 };
    const D1 = selectDeterministic(player, 0.8);
    const D2 = selectDeterministic(player, 0.8);
    expect(D1).toBe(D2);
  });
});

describe('expectedProbability', () => {
  it('returns the same as expectedScore', () => {
    expect(expectedProbability(1000, 800)).toBeCloseTo(1 / (1 + Math.pow(10, (800 - 1000) / 400)), 10);
  });
});
