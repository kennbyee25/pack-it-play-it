import type { Rng } from './rng';

export type ScheduleMode = 'interleaved' | 'blocked';

export interface ScheduledItem {
  gameId: string;
  difficulty: number;
}

export interface ScheduleOptions {
  gameIds: string[];
  dosePerGame: number; // puzzles each game appears
  mode: ScheduleMode;
  maxRunLength?: number; // interleaved: cap consecutive repeats of one game (default 1)
  difficultyFor?: (gameId: string) => number; // default 1000
}

const DEFAULT_DIFFICULTY = 1000;

// Emit a session as a flat stream of {gameId, difficulty}. Total dose is identical
// across modes (equal dose per game), so interleaved vs blocked is a clean A5
// experimental contrast with no confound.
export function buildSchedule(opts: ScheduleOptions, rng: Rng): ScheduledItem[] {
  const { gameIds, dosePerGame, mode } = opts;
  const difficultyFor = opts.difficultyFor ?? (() => DEFAULT_DIFFICULTY);
  const toItem = (gameId: string): ScheduledItem => ({
    gameId,
    difficulty: difficultyFor(gameId),
  });

  if (mode === 'blocked') {
    // Each game in one contiguous run; randomize the order of the blocks.
    return rng
      .shuffle(gameIds)
      .flatMap((id) => Array.from({ length: dosePerGame }, () => toItem(id)));
  }

  // Interleaved: round-robin-ish draw without exceeding maxRunLength repeats.
  const maxRun = Math.max(1, opts.maxRunLength ?? 1);
  const remaining = new Map(gameIds.map((id) => [id, dosePerGame]));
  const out: ScheduledItem[] = [];
  let lastId: string | null = null;
  let run = 0;

  while ([...remaining.values()].some((n) => n > 0)) {
    // Candidates with stock; exclude the last game if it just hit the run cap.
    let candidates = [...remaining.entries()].filter(([, n]) => n > 0).map(([id]) => id);
    if (lastId !== null && run >= maxRun && candidates.length > 1) {
      candidates = candidates.filter((id) => id !== lastId);
    }
    // Prefer the games with the most remaining to keep the stream balanced.
    const maxRemaining = Math.max(...candidates.map((id) => remaining.get(id)!));
    const topped = candidates.filter((id) => remaining.get(id) === maxRemaining);
    const chosen = rng.pick(topped);

    out.push(toItem(chosen));
    remaining.set(chosen, remaining.get(chosen)! - 1);
    run = chosen === lastId ? run + 1 : 1;
    lastId = chosen;
  }
  return out;
}
