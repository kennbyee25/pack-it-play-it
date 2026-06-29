import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Ratings,
  recordOutcome as recordOutcomePure,
  parse,
  serialize,
} from '@/games/skill/ratings';

const STORAGE_KEY = 'pip.ratings';

function load(): Ratings {
  if (typeof window === 'undefined') return {};
  return parse(window.localStorage.getItem(STORAGE_KEY));
}

// localStorage-backed per-game Glicko ratings. `ratingsRef` mirrors the latest
// state so callers (e.g. EndlessMode's advance) can read the freshest rating
// synchronously when selecting the next difficulty.
export function useRatings() {
  const [ratings, setRatings] = useState<Ratings>(load);
  const ratingsRef = useRef(ratings);
  ratingsRef.current = ratings;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, serialize(ratings));
    } catch {
      // ignore quota/availability errors — ratings still work in-memory
    }
  }, [ratings]);

  // Record an attempt and return the *updated* rating for that game (so the caller
  // can immediately pick the next difficulty without waiting for a re-render).
  const recordOutcome = useCallback((gameId: string, difficulty: number, score: number) => {
    const next = recordOutcomePure(ratingsRef.current, gameId, difficulty, score);
    ratingsRef.current = next;
    setRatings(next);
    return next[gameId];
  }, []);

  return { ratings, ratingsRef, recordOutcome };
}
