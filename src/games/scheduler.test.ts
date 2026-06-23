import { describe, it, expect } from 'vitest';
import { buildSchedule, type ScheduledItem } from './scheduler';
import { makeRng } from './rng';

const games = ['a', 'b', 'c'];
const dose = 5;

const counts = (items: ScheduledItem[]) =>
  items.reduce<Record<string, number>>((m, it) => {
    m[it.gameId] = (m[it.gameId] ?? 0) + 1;
    return m;
  }, {});

const maxRun = (ids: string[]) => {
  let best = 0;
  let cur = 0;
  let prev: string | null = null;
  for (const id of ids) {
    cur = id === prev ? cur + 1 : 1;
    prev = id;
    best = Math.max(best, cur);
  }
  return best;
};

describe('buildSchedule — equal dose (A5 confound control)', () => {
  it.each(['interleaved', 'blocked'] as const)('gives each game equal dose in %s mode', (mode) => {
    const items = buildSchedule({ gameIds: games, dosePerGame: dose, mode }, makeRng(1));
    expect(items).toHaveLength(games.length * dose);
    expect(counts(items)).toEqual({ a: dose, b: dose, c: dose });
  });
});

describe('interleaved mode', () => {
  it('never repeats a game beyond the max run length', () => {
    const items = buildSchedule(
      { gameIds: games, dosePerGame: dose, mode: 'interleaved', maxRunLength: 1 },
      makeRng(2),
    );
    expect(maxRun(items.map((i) => i.gameId))).toBe(1);
  });

  it('respects a larger maxRunLength', () => {
    const items = buildSchedule(
      { gameIds: games, dosePerGame: dose, mode: 'interleaved', maxRunLength: 2 },
      makeRng(3),
    );
    expect(maxRun(items.map((i) => i.gameId))).toBeLessThanOrEqual(2);
  });
});

describe('blocked mode', () => {
  it('emits each game as one contiguous run', () => {
    const items = buildSchedule({ gameIds: games, dosePerGame: dose, mode: 'blocked' }, makeRng(4));
    const ids = items.map((i) => i.gameId);
    // number of distinct contiguous runs == number of games
    const runs = ids.filter((id, i) => id !== ids[i - 1]).length;
    expect(runs).toBe(games.length);
  });
});

describe('difficulty assignment', () => {
  it('uses the provided per-game difficulty function', () => {
    const items = buildSchedule(
      { gameIds: games, dosePerGame: 1, mode: 'blocked', difficultyFor: (id) => (id === 'a' ? 200 : 1800) },
      makeRng(5),
    );
    expect(items.find((i) => i.gameId === 'a')!.difficulty).toBe(200);
    expect(items.find((i) => i.gameId === 'b')!.difficulty).toBe(1800);
  });
});
