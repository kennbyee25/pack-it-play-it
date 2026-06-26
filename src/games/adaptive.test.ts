import { describe, it, expect } from 'vitest';
import { adaptDifficulty, easeDifficulty, ADAPT } from './adaptive';
import { DIFFICULTY } from './settings';

const base = 1000;

describe('adaptDifficulty (time-based)', () => {
  it('increases when solved quickly', () => {
    expect(adaptDifficulty(base, { moves: 5, optimalMoves: 5, seconds: 10 })).toBe(base + ADAPT.step);
  });

  it('decreases when solved slowly', () => {
    expect(adaptDifficulty(base, { moves: 5, optimalMoves: 5, seconds: 60 })).toBe(base - ADAPT.step);
  });

  it('stays put in the neutral band (between quick and slow)', () => {
    expect(adaptDifficulty(base, { moves: 5, optimalMoves: 5, seconds: 38 })).toBe(base);
  });

  it('ignores move count — a click-heavy but quick solve still levels up', () => {
    // Cycling UIs (graph coloring / max cut) inflate clicks far past optimal;
    // that must not stop a fast solve from raising difficulty.
    expect(adaptDifficulty(base, { moves: 99, optimalMoves: 5, seconds: 5 })).toBe(base + ADAPT.step);
  });

  it('clamps to the difficulty range', () => {
    expect(adaptDifficulty(DIFFICULTY.max, { moves: 5, optimalMoves: 5, seconds: 1 })).toBe(DIFFICULTY.max);
    expect(adaptDifficulty(DIFFICULTY.min, { moves: 5, optimalMoves: 5, seconds: 99 })).toBe(DIFFICULTY.min);
  });
});

describe('easeDifficulty (skip)', () => {
  it('drops one step when a puzzle is skipped', () => {
    expect(easeDifficulty(base)).toBe(base - ADAPT.step);
  });

  it('clamps at the floor', () => {
    expect(easeDifficulty(DIFFICULTY.min)).toBe(DIFFICULTY.min);
  });
});
