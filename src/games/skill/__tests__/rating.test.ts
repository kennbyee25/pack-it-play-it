import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RATING,
  PlayerRating,
  expectedScore,
  updatePlayer,
  decayRating,
} from '../rating';

describe('DEFAULT_RATING', () => {
  it('starts at skill=100, rd=350, games=0', () => {
    expect(DEFAULT_RATING.skill).toBe(100);
    expect(DEFAULT_RATING.rd).toBe(350);
    expect(DEFAULT_RATING.games).toBe(0);
  });
});

describe('expectedScore', () => {
  it('returns 0.5 when skill equals difficulty', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
  });

  it('returns >0.5 when skill exceeds difficulty (easier puzzle)', () => {
    const score = expectedScore(1500, 1200);
    expect(score).toBeGreaterThan(0.5);
    // (1500-1200)/400 = 0.75; 10^-0.75 ≈ 0.177; 1/1.177 ≈ 0.85
    expect(score).toBeCloseTo(0.85, 1);
  });

  it('returns <0.5 when skill is below difficulty (harder puzzle)', () => {
    const score = expectedScore(900, 1200);
    expect(score).toBeLessThan(0.5);
  });

  it('is symmetric: expectedScore(a,b) = 1 - expectedScore(b,a)', () => {
    const a = 1200;
    const b = 1500;
    const sab = expectedScore(a, b);
    const sba = expectedScore(b, a);
    expect(sab + sba).toBeCloseTo(1, 5);
  });

  it('approaches 1 as skill >> difficulty', () => {
    expect(expectedScore(2500, 100)).toBeCloseTo(1, 3);
  });

  it('approaches 0 as skill << difficulty', () => {
    expect(expectedScore(100, 2500)).toBeCloseTo(0, 3);
  });
});

describe('updatePlayer', () => {
  const base: PlayerRating = { skill: 1000, rd: 350, games: 5 };

  it('increases skill on win (outcome=1)', () => {
    const updated = updatePlayer(base, 1000, 1);
    expect(updated.skill).toBeGreaterThan(base.skill);
  });

  it('decreases skill on loss (outcome=0)', () => {
    const updated = updatePlayer(base, 1000, 0);
    expect(updated.skill).toBeLessThan(base.skill);
  });

  it('barely moves skill on draw (outcome=0.5, skill ≈ difficulty)', () => {
    const updated = updatePlayer(base, 1000, 0.5);
    // expected ~0.5, delta ≈ K*(0.5-0.5) ≈ 0
    expect(updated.skill).toBeCloseTo(base.skill, 0);
  });

  it('shrinks RD after each game', () => {
    const updated = updatePlayer(base, 1000, 1);
    expect(updated.rd).toBeLessThan(base.rd);
  });

  it('never shrinks RD below the floor (default 30)', () => {
    let r: PlayerRating = { skill: 1000, rd: 35, games: 100 };
    for (let i = 0; i < 20; i++) {
      r = updatePlayer(r, 1000, 0.5);
    }
    expect(r.rd).toBeGreaterThanOrEqual(30);
  });

  it('RD shrinks by ~1% per game with default decay', () => {
    const r = updatePlayer(base, 1000, 1);
    expect(r.rd).toBeCloseTo(base.rd * 0.99, 1);
  });

  it('clamps outcome to [0,1]', () => {
    const up1 = updatePlayer(base, 1000, 1.5);
    const up2 = updatePlayer(base, 1000, 1);
    expect(up1.skill).toBe(up2.skill);

    const dn1 = updatePlayer(base, 1000, -0.5);
    const dn2 = updatePlayer(base, 1000, 0);
    expect(dn1.skill).toBe(dn2.skill);
  });

  it('applies larger updates when RD is high', () => {
    const highRd: PlayerRating = { skill: 1000, rd: 350, games: 0 };
    const lowRd: PlayerRating = { skill: 1000, rd: 30, games: 100 };
    const highUpdate = updatePlayer(highRd, 1000, 1);
    const lowUpdate = updatePlayer(lowRd, 1000, 1);
    expect(Math.abs(highUpdate.skill - 1000)).toBeGreaterThan(
      Math.abs(lowUpdate.skill - 1000),
    );
  });

  it('increments games counter', () => {
    const updated = updatePlayer(base, 1000, 0.5);
    expect(updated.games).toBe(base.games + 1);
  });

  it('works with custom config', () => {
    const updated = updatePlayer(base, 1000, 1, {
      baseK: 64,
      initialRd: 350,
      rdDecay: 0.5,
      rdFloor: 10,
    });
    expect(updated.skill).toBeGreaterThan(base.skill);
    expect(updated.rd).toBeLessThanOrEqual(base.rd * 0.5);
  });
});

describe('decayRating', () => {
  it('shrinks RD and increments games without changing skill', () => {
    const r: PlayerRating = { skill: 1000, rd: 200, games: 10 };
    const d = decayRating(r);
    expect(d.skill).toBe(1000);
    expect(d.rd).toBeLessThan(200);
    expect(d.games).toBe(11);
  });
});
