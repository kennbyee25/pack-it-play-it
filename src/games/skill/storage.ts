// Per-game PlayerRating persistence via localStorage.
// Each game gets its own key: `pip.skill.rating.<gameId>`
//
// Keep existing manual settings.difficulty as override/debug — this layer
// is the normal-play source of truth for skill-based difficulty selection.

import { type PlayerRating, DEFAULT_RATING } from './rating';

const STORAGE_PREFIX = 'pip.skill.rating.';

/**
 * Load rating for a given gameId.
 * Returns DEFAULT_RATING when nothing is stored or on parse failure.
 */
export function loadRating(gameId: string): PlayerRating {
  if (typeof window === 'undefined') return DEFAULT_RATING;
  const key = STORAGE_PREFIX + gameId;
  const raw = window.localStorage.getItem(key);
  if (!raw) return DEFAULT_RATING;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.skill === 'number' &&
      typeof parsed.rd === 'number' &&
      typeof parsed.games === 'number'
    ) {
      return parsed as PlayerRating;
    }
  } catch {
    // corrupt entry — fall through to default
  }
  return DEFAULT_RATING;
}

/**
 * Persist a rating for a given gameId.
 */
export function saveRating(gameId: string, rating: PlayerRating): void {
  if (typeof window === 'undefined') return;
  const key = STORAGE_PREFIX + gameId;
  try {
    window.localStorage.setItem(key, JSON.stringify(rating));
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}

/**
 * Remove the persisted rating for a single game.
 */
export function clearRating(gameId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_PREFIX + gameId);
}

/**
 * Wipe all skill ratings from localStorage.
 */
export function clearAllRatings(): void {
  if (typeof window === 'undefined') return;
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      toRemove.push(key);
    }
  }
  for (const key of toRemove) {
    window.localStorage.removeItem(key);
  }
}

/**
 * Load ratings for all known game IDs at once.
 */
export function loadAllRatings(gameIds: string[]): Record<string, PlayerRating> {
  const result: Record<string, PlayerRating> = {};
  for (const id of gameIds) {
    result[id] = loadRating(id);
  }
  return result;
}
