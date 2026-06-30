import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadRating,
  saveRating,
  clearRating,
  clearAllRatings,
  loadAllRatings,
} from '../storage';
import { DEFAULT_RATING, type PlayerRating } from '../rating';

beforeEach(() => {
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
  }
});

describe('storage', () => {
  const gameId = 'test-game';

  it('returns DEFAULT_RATING for unknown game', () => {
    const r = loadRating('nonexistent');
    expect(r).toEqual(DEFAULT_RATING);
  });

  it('round-trips a rating', () => {
    const rating: PlayerRating = { skill: 500, rd: 120, games: 15 };
    saveRating(gameId, rating);
    const loaded = loadRating(gameId);
    expect(loaded).toEqual(rating);
  });

  it('overwrites previous rating', () => {
    saveRating(gameId, { skill: 100, rd: 350, games: 0 });
    saveRating(gameId, { skill: 200, rd: 100, games: 5 });
    const loaded = loadRating(gameId);
    expect(loaded.skill).toBe(200);
    expect(loaded.games).toBe(5);
  });

  it('clearRating removes the entry', () => {
    saveRating(gameId, { skill: 500, rd: 120, games: 15 });
    clearRating(gameId);
    expect(loadRating(gameId)).toEqual(DEFAULT_RATING);
  });

  it('clearAllRatings removes all skill-prefixed entries', () => {
    saveRating('game-a', { skill: 100, rd: 350, games: 0 });
    saveRating('game-b', { skill: 200, rd: 200, games: 5 });
    clearAllRatings();
    expect(loadRating('game-a')).toEqual(DEFAULT_RATING);
    expect(loadRating('game-b')).toEqual(DEFAULT_RATING);
  });

  it('loadAllRatings loads multiple games', () => {
    saveRating('a', { skill: 100, rd: 350, games: 0 });
    saveRating('b', { skill: 200, rd: 200, games: 5 });
    const all = loadAllRatings(['a', 'b', 'c']);
    expect(all.a.skill).toBe(100);
    expect(all.b.skill).toBe(200);
    expect(all.c).toEqual(DEFAULT_RATING);
  });

  it('handles corrupt data gracefully', () => {
    const key = 'pip.skill.rating.' + gameId;
    window.localStorage.setItem(key, '{broken json');
    const loaded = loadRating(gameId);
    expect(loaded).toEqual(DEFAULT_RATING);
  });

  it('handles missing fields gracefully', () => {
    const key = 'pip.skill.rating.' + gameId;
    window.localStorage.setItem(key, JSON.stringify({ skill: 100 })); // missing rd, games
    const loaded = loadRating(gameId);
    expect(loaded).toEqual(DEFAULT_RATING);
  });
});
