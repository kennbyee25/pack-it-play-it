import { describe, it, expect } from 'vitest';
import { adaptDifficulty, ADAPT } from './adaptive';
import { DIFFICULTY } from './settings';

const base = 1000;

describe('adaptDifficulty', () => {
  it('increases when solved optimally and quickly', () => {
    expect(adaptDifficulty(base, { moves: 5, optimalMoves: 5, seconds: 10 })).toBe(base + ADAPT.step);
  });

  it('decreases on a mistake (more moves than optimal)', () => {
    expect(adaptDifficulty(base, { moves: 7, optimalMoves: 5, seconds: 10 })).toBe(base - ADAPT.step);
  });

  it('decreases when slow (over the slow threshold)', () => {
    expect(adaptDifficulty(base, { moves: 5, optimalMoves: 5, seconds: 60 })).toBe(base - ADAPT.step);
  });

  it('stays put in the neutral band (optimal but not quick)', () => {
    expect(adaptDifficulty(base, { moves: 5, optimalMoves: 5, seconds: 40 })).toBe(base);
  });

  it('does not reward partial/auto solves (fewer moves than optimal)', () => {
    expect(adaptDifficulty(base, { moves: 0, optimalMoves: 5, seconds: 1 })).toBe(base);
  });

  it('clamps to the difficulty range', () => {
    expect(adaptDifficulty(DIFFICULTY.max, { moves: 5, optimalMoves: 5, seconds: 1 })).toBe(DIFFICULTY.max);
    expect(adaptDifficulty(DIFFICULTY.min, { moves: 9, optimalMoves: 5, seconds: 1 })).toBe(DIFFICULTY.min);
  });
});
