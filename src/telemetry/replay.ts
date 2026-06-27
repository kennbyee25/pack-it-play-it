// Faithful-capture guard — the schema's kill criterion. A trace is only valuable
// training data if it can RECONSTRUCT the solve. Because generation is pure and the
// RNG is deterministic, a puzzle is rebuilt from (gameId, difficulty, genSeed) and
// the move log replays to the solved state.

import { getGame } from '../games/registry';
import { makeRng } from '../games/rng';
import type { TraceEvent, MoveEvent } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function reconstructPuzzle(gameId: string, difficulty: number, genSeed: number): any {
  const game = getGame(gameId);
  return game.generate(difficulty, makeRng(genSeed)).puzzle;
}

export interface ReplaySummary {
  solved: boolean;
  moveCount: number;
}

// Replay a single puzzle's events (one puzzle_started + its move events) and check
// the final state is solved.
export function replayVerify(events: TraceEvent[]): ReplaySummary {
  const started = events.find((e) => e.type === 'puzzle_started');
  if (started?.type !== 'puzzle_started') {
    return { solved: false, moveCount: 0 };
  }
  const game = getGame(started.gameId);
  let state = reconstructPuzzle(started.gameId, started.difficulty, started.genSeed);

  const moves = events
    .filter((e): e is MoveEvent => e.type === 'move')
    .sort((a, b) => a.moveIndex - b.moveIndex);

  for (const m of moves) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state = game.applyMove(state, m.move as any);
  }
  return { solved: game.isSolved(state), moveCount: moves.length };
}
