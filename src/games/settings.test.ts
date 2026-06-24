import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY,
  defaultSettings,
  mergeSettings,
  enabledGameIds,
  difficultyFor,
  setEnabled,
  setDifficulty,
  serialize,
  parse,
  sessionKey,
} from './settings';

const games = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('defaultSettings', () => {
  it('enables every game at the default difficulty', () => {
    const s = defaultSettings(games);
    expect(Object.keys(s)).toEqual(['a', 'b', 'c']);
    expect(Object.values(s).every((g) => g.enabled && g.difficulty === DIFFICULTY.default)).toBe(true);
  });
});

describe('mergeSettings', () => {
  it('adds newly-registered games (enabled) and drops unknown ids', () => {
    const stored = { a: { enabled: false, difficulty: 700 }, gone: { enabled: false, difficulty: 100 } };
    const merged = mergeSettings(stored, games);
    expect(Object.keys(merged)).toEqual(['a', 'b', 'c']); // 'gone' dropped, b/c added
    expect(merged.a).toEqual({ enabled: false, difficulty: 700 });
    expect(merged.b.enabled).toBe(true);
  });

  it('falls back to all-enabled when stored has nothing enabled', () => {
    const merged = mergeSettings({ a: { enabled: false, difficulty: 100 } }, [{ id: 'a' }]);
    expect(merged.a.enabled).toBe(true);
  });

  it('returns defaults for null', () => {
    expect(mergeSettings(null, games)).toEqual(defaultSettings(games));
  });
});

describe('setEnabled guard', () => {
  it('refuses to disable the last enabled game', () => {
    let s = defaultSettings([{ id: 'a' }, { id: 'b' }]);
    s = setEnabled(s, 'b', false);
    expect(enabledGameIds(s)).toEqual(['a']);
    const blocked = setEnabled(s, 'a', false);
    expect(enabledGameIds(blocked)).toEqual(['a']); // unchanged
  });

  it('allows re-enabling', () => {
    let s = setEnabled(defaultSettings(games), 'b', false);
    s = setEnabled(s, 'b', true);
    expect(enabledGameIds(s)).toContain('b');
  });
});

describe('setDifficulty', () => {
  it('clamps and snaps to the configured range/step', () => {
    const s = defaultSettings([{ id: 'a' }]);
    expect(setDifficulty(s, 'a', 99999).a.difficulty).toBe(DIFFICULTY.max);
    expect(setDifficulty(s, 'a', -10).a.difficulty).toBe(DIFFICULTY.min);
  });
});

describe('difficultyFor', () => {
  it('returns each game configured difficulty', () => {
    const s = setDifficulty(defaultSettings(games), 'a', 1800);
    const f = difficultyFor(s);
    expect(f('a')).toBe(1800);
    expect(f('b')).toBe(DIFFICULTY.default);
  });
});

describe('serialize/parse', () => {
  it('round-trips', () => {
    const s = defaultSettings(games);
    expect(mergeSettings(parse(serialize(s)), games)).toEqual(s);
  });
  it('returns null for garbage', () => {
    expect(parse('not json')).toBeNull();
    expect(parse(null)).toBeNull();
  });
});

describe('sessionKey', () => {
  it('changes when enabled or difficulty changes, stable otherwise', () => {
    const s = defaultSettings(games);
    expect(sessionKey(s)).toBe(sessionKey(defaultSettings(games)));
    expect(sessionKey(setEnabled(s, 'b', false))).not.toBe(sessionKey(s));
    expect(sessionKey(setDifficulty(s, 'a', 1500))).not.toBe(sessionKey(s));
  });
});
