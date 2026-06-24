import type { PuzzleGame } from './types';

export const DIFFICULTY = { min: 100, max: 2500, step: 50, default: 1000 } as const;

export interface GameSetting {
  enabled: boolean;
  difficulty: number;
}
// Keyed by game id.
export type GameSettings = Record<string, GameSetting>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Game = Pick<PuzzleGame<any, any>, 'id'>;

const clampDifficulty = (v: number): number => {
  const n = Math.round(v / DIFFICULTY.step) * DIFFICULTY.step;
  return Math.min(DIFFICULTY.max, Math.max(DIFFICULTY.min, n));
};

export function defaultSettings(games: readonly Game[]): GameSettings {
  return Object.fromEntries(
    games.map((g) => [g.id, { enabled: true, difficulty: DIFFICULTY.default }]),
  );
}

// Reconcile stored settings with the current registry: keep known games, add
// newly-registered ones (enabled by default), drop ids that no longer exist.
export function mergeSettings(stored: Partial<GameSettings> | null, games: readonly Game[]): GameSettings {
  const base = defaultSettings(games);
  if (!stored) return base;
  for (const g of games) {
    const s = stored[g.id];
    if (s && typeof s.enabled === 'boolean' && typeof s.difficulty === 'number') {
      base[g.id] = { enabled: s.enabled, difficulty: clampDifficulty(s.difficulty) };
    }
  }
  // Guard: never persist an empty rotation.
  if (!Object.values(base).some((s) => s.enabled)) {
    for (const g of games) base[g.id].enabled = true;
  }
  return base;
}

export function enabledGameIds(settings: GameSettings): string[] {
  return Object.entries(settings)
    .filter(([, s]) => s.enabled)
    .map(([id]) => id);
}

export function difficultyFor(settings: GameSettings): (id: string) => number {
  return (id) => settings[id]?.difficulty ?? DIFFICULTY.default;
}

// Toggle a game; refuses to disable the last enabled game (rotation stays non-empty).
export function setEnabled(settings: GameSettings, id: string, on: boolean): GameSettings {
  if (!settings[id]) return settings;
  if (!on && enabledGameIds(settings).length === 1 && settings[id].enabled) {
    return settings; // would empty the rotation — no-op
  }
  return { ...settings, [id]: { ...settings[id], enabled: on } };
}

export function setDifficulty(settings: GameSettings, id: string, value: number): GameSettings {
  if (!settings[id]) return settings;
  return { ...settings, [id]: { ...settings[id], difficulty: clampDifficulty(value) } };
}

export function serialize(settings: GameSettings): string {
  return JSON.stringify(settings);
}

// Tolerant parse: invalid/garbage JSON yields null so callers fall back to defaults.
export function parse(json: string | null): Partial<GameSettings> | null {
  if (!json) return null;
  try {
    const v = JSON.parse(json);
    return v && typeof v === 'object' ? (v as Partial<GameSettings>) : null;
  } catch {
    return null;
  }
}

// Stable signature of the bits that affect the schedule (enabled set + difficulties),
// so consumers can detect "the session changed" cheaply.
export function sessionKey(settings: GameSettings): string {
  return Object.keys(settings)
    .sort()
    .map((id) => `${id}:${settings[id].enabled ? 1 : 0}:${settings[id].difficulty}`)
    .join('|');
}
