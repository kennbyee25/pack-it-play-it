import type { PuzzleGame } from './types';

export const DIFFICULTY = {
  min: 100,
  // Algorithmic ceiling — intentionally uncapped so AI/algorithmic play can
  // exceed the historic 2500 cap. The manual slider stays bounded by uiMax.
  max: Number.MAX_SAFE_INTEGER,
  uiMax: 2500,
  step: 50,
  default: 100,
} as const;

// Games disabled by default because their difficulty knob fails the A2 monotonicity
// gate (success rate not monotone with D) — see docs/plans/vision-and-mvp-roadmap.md
// (MVP 0). They remain selectable; remove from this set once calibrated.
export const DEFAULT_DISABLED: ReadonlySet<string> = new Set(['three-sat']);

const enabledByDefault = (id: string): boolean => !DEFAULT_DISABLED.has(id);

export interface GameSetting {
  enabled: boolean;
  difficulty: number;
}
// Keyed by game id.
export type GameSettings = Record<string, GameSetting>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Game = Pick<PuzzleGame<any, any>, 'id'>;

export const clampDifficulty = (v: number): number => {
  const n = Math.round(v / DIFFICULTY.step) * DIFFICULTY.step;
  // Enforce minimum difficulty only; upper bound is uncapped to allow AI/algorithmic play.
  return Math.max(DIFFICULTY.min, n);
};

export function defaultSettings(games: readonly Game[]): GameSettings {
  return Object.fromEntries(
    games.map((g) => [g.id, { enabled: enabledByDefault(g.id), difficulty: DIFFICULTY.default }]),
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

/** Enable every game in settings. */
export function selectAll(settings: GameSettings): GameSettings {
  const next = { ...settings };
  for (const id of Object.keys(next)) {
    next[id] = { ...next[id], enabled: true };
  }
  return next;
}

/** Disable every game except `keepId` (if provided and valid).
 *  Falls back to the same guard as setEnabled: never leave the rotation empty. */
export function deselectAll(settings: GameSettings, keepId?: string): GameSettings {
  const next = { ...settings };
  const ids = Object.keys(next);
  let keepCount = 0;
  for (const id of ids) {
    next[id] = { ...next[id], enabled: id === keepId };
    if (id === keepId) keepCount++;
  }
  // If after deselection nothing is enabled, re-enable everything.
  if (keepCount === 0 || !ids.some((id) => next[id].enabled)) {
    for (const id of ids) next[id] = { ...next[id], enabled: true };
  }
  return next;
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

// ── Session options (global, not per-game) ────────────────────────────────────

export interface SessionOptions {
  uniqueSolution: boolean;
  /**
   * Difficulty tuning algorithm selection.
   * 'smart' – current Glicko‑lite rating system (default).
   * 'naive' – simple telemetry‑based step up/down.
   * 'adaptive' – time‑based heuristic from adaptive.ts.
   */
  tuningAlgorithm: 'smart' | 'naive' | 'adaptive';
}

export const SESSION_OPTIONS_KEY = 'pip.sessionOptions';

export const defaultSessionOptions = (): SessionOptions => ({ uniqueSolution: false, tuningAlgorithm: 'smart' });

export function serializeSessionOptions(o: SessionOptions): string {
  return JSON.stringify(o);
}

export function parseSessionOptions(json: string | null): SessionOptions {
  if (!json) return defaultSessionOptions();
  try {
    const v = JSON.parse(json);
    if (!v || typeof v !== 'object') return defaultSessionOptions();
    return {
      uniqueSolution: typeof v.uniqueSolution === 'boolean' ? v.uniqueSolution : false,
      tuningAlgorithm: v.tuningAlgorithm === 'smart' || v.tuningAlgorithm === 'naive' || v.tuningAlgorithm === 'adaptive' ? v.tuningAlgorithm : 'smart',
    };
  } catch {
    return defaultSessionOptions();
  }
}

// ── Stable session key ──────────────────────────────────────────────────────//

// Stable signature of the bits that affect the schedule (enabled set + difficulties),
// so consumers can detect "the session changed" cheaply.
export function sessionKey(settings: GameSettings): string {
  return Object.keys(settings)
    .sort()
    .map((id) => `${id}:${settings[id].enabled ? 1 : 0}:${settings[id].difficulty}`)
    .join('|');
}
