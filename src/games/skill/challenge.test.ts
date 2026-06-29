import { describe, it, expect } from 'vitest';
import { makeRng } from '../rng';
import { newPlayer, expectedScore } from './estimator';
import { getRating, recordOutcome, parse, serialize } from './ratings';
import { selectChallenge, OCP } from './challenge';
import { DIFFICULTY } from '../settings';

describe('ratings store', () => {
  it('falls back to a fresh player for unknown games', () => {
    expect(getRating({}, 'set-cover')).toEqual(newPlayer());
  });

  it('recordOutcome updates one game immutably and shrinks rd', () => {
    const r0 = {};
    const r1 = recordOutcome(r0, 'set-cover', 500, 1);
    expect(r0).toEqual({}); // immutable
    expect(r1['set-cover'].rd).toBeLessThan(newPlayer().rd);
    // a win above-expectation raises skill
    expect(r1['set-cover'].skill).toBeGreaterThan(newPlayer().skill);
  });

  it('serialize/parse round-trips and rejects garbage', () => {
    const r = recordOutcome({}, 'clique', 700, 0.5);
    expect(parse(serialize(r))).toEqual(r);
    expect(parse('not json')).toEqual({});
    expect(parse(JSON.stringify({ x: { skill: 'nan' } }))).toEqual({});
  });
});

describe('selectChallenge (OCP)', () => {
  it('aims at the target success band and stays in the difficulty range', () => {
    const r = newPlayer();
    const d = selectChallenge(r); // no jitter
    // expected success at the chosen difficulty ≈ OCP target
    expect(expectedScore(r.skill, d)).toBeCloseTo(OCP.target, 1);
    expect(d).toBeGreaterThanOrEqual(DIFFICULTY.min);
    expect(d).toBeLessThanOrEqual(DIFFICULTY.max);
  });

  it('jitter widens with rd (band, not a point)', () => {
    const rng = makeRng(1);
    const highRd = newPlayer(800, 400);
    const lowRd = newPlayer(800, 80);
    const spread = (r: typeof highRd) => {
      const xs = Array.from({ length: 50 }, () => selectChallenge(r, rng));
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(spread(highRd)).toBeGreaterThan(spread(lowRd));
  });
});

// The proof: an adaptive loop driving difficulty by OCP keeps a fixed-skill player
// inside the target success band, and the rating converges toward true skill.
describe('OCP loop holds the player in the challenge band', () => {
  it.each([400, 800, 1300])('true skill %i → realized success ≈ target', (trueSkill) => {
    const rng = makeRng(trueSkill + 1);
    let rating = newPlayer();
    const wins: number[] = [];
    for (let i = 0; i < 400; i++) {
      const d = selectChallenge(rating, rng);
      const win = rng.next() < expectedScore(trueSkill, d) ? 1 : 0;
      wins.push(win);
      rating = recordOutcome({ g: rating }, 'g', d, win).g;
    }
    const backHalf = wins.slice(200);
    const realized = backHalf.reduce((a, b) => a + b, 0) / backHalf.length;
    // Realized success sits near the target band. Note a mild *upward* bias: when
    // true skill starts far above the estimate, an 0.8 target serves slightly-easy
    // puzzles during convergence (wins carry less info), so success runs a touch
    // high until the rating catches up. Tolerance reflects that estimator lag.
    expect(realized).toBeGreaterThan(OCP.target - 0.12);
    expect(realized).toBeLessThan(OCP.target + 0.15);
    expect(Math.abs(rating.skill - trueSkill)).toBeLessThan(160);
  });
});
