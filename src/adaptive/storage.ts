// Storage for player ratings per game.
// Uses localStorage with key `pip.rating.<gameId>`.
export const RATING_PREFIX = 'pip.rating.';

/**
 * Load rating for a given gameId.
 * If not found, returns DEFAULT_RATING.
 */
export function loadRating(gameId: string): PlayerRating {
  if (typeof window === 'undefined') return DEFAULT_RATING;
  const key = RATING_PREFIX + gameId;
  const raw = window.localStorage.getItem(key);
  if (!raw) return DEFAULT_RATING;
  try {
    const parsed = JSON.parse(raw);
    // Validate shape
    if (
      typeof parsed.skill === 'number' &&
      typeof parsed.rd === 'number' &&
      typeof parsed.games === 'number'
    ) {
      return parsed as PlayerRating;
    }
  } catch {
    // ignore
  }
  return DEFAULT_RATING;
}

/**
 * Save rating for a given gameId.
 */
export function saveRating(gameId: string, rating: PlayerRating): void {
  if (typeof window === 'undefined') return;
  const key = RATING_PREFIX + gameId;
  try {
    window.localStorage.setItem(key, JSON.stringify(rating));
  } catch {
    // ignore quota errors
  }
}

/**
 * Clear all ratings (useful for debugging).
 */
export function clearAllRatings(): void {
  if (typeof window === 'undefined') return;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(RATING_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  }
}