// Tracer — the small runtime API the UI calls. Holds the active puzzle's identity
// and start time, stamps events, and delegates to a TraceSink. A module singleton
// (`tracer`) keeps wiring trivial; tests use `createTracer` with a fake sink.

import { getMetadata } from '../games/metadata';
import type { TraceEvent } from './types';
import { makePuzzleId } from './types';
import { type TraceSink, makeSink, getAnonId, guardedSink } from './sink';

export interface StartInfo {
  index: number;
  gameId: string;
  difficulty: number;
  genSeed: number;
  optimalMoves: number;
}

export interface EndInfo {
  outcome: 'solved' | 'abandoned' | 'failed';
  moves: number;
  optimalMoves: number;
  seconds: number;
  score: number;
}

export interface Tracer {
  puzzleStarted(info: StartInfo): void;
  move(move: unknown): void;
  puzzleEnded(info: EndInfo): void;
  flush(): Promise<void>;
}

export function createTracer(sink: TraceSink, sessionId: string, now: () => number = Date.now): Tracer {
  let puzzleId = '';
  let startedAt = 0;
  let moveIndex = 0;

  const base = () => ({ sessionId, puzzleId, ts: now() });
  const send = (e: TraceEvent) => sink.emit(e);

  return {
    puzzleStarted(info) {
      puzzleId = makePuzzleId(sessionId, info.index);
      startedAt = now();
      moveIndex = 0;
      send({
        type: 'puzzle_started',
        ...base(),
        gameId: info.gameId,
        category: getMetadata(info.gameId).category,
        difficulty: info.difficulty,
        genSeed: info.genSeed,
        optimalMoves: info.optimalMoves,
      });
    },
    move(move) {
      if (!puzzleId) return; // no active puzzle
      send({ type: 'move', ...base(), moveIndex: moveIndex++, move, msSinceStart: now() - startedAt });
    },
    puzzleEnded(info) {
      if (!puzzleId) return;
      send({ type: 'puzzle_ended', ...base(), ...info });
      puzzleId = '';
    },
    flush: () => sink.flush(),
  };
}

// App-wide singleton (Noop unless Supabase env is configured; opt-out applied live).
export const tracer: Tracer = createTracer(guardedSink(makeSink()), getAnonId());
