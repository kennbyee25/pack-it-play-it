// MVP 5 — telemetry trace schema.
// Every puzzle attempt becomes a stream: puzzle_started → move* → puzzle_ended.
// Traces carry ONLY game state, timing, and seeds — never PII. A puzzle is fully
// reconstructable from (gameId, difficulty, genSeed), so we never store full board
// state — just that tuple plus the move log (see telemetry/replay.ts).

import type { Category } from '../games/metadata';

export type TraceOutcome = 'solved' | 'abandoned' | 'failed';

export interface BaseEvent {
  sessionId: string; // anonymous, per-browser (crypto.randomUUID)
  puzzleId: string; // `${sessionId}:${index}` — ties a puzzle's events together
  ts: number; // epoch ms
}

export interface PuzzleStarted extends BaseEvent {
  type: 'puzzle_started';
  gameId: string;
  category: Category;
  difficulty: number;
  genSeed: number; // reconstruction key
  optimalMoves: number; // planted solution length
}

export interface MoveEvent extends BaseEvent {
  type: 'move';
  moveIndex: number; // 0-based order within the puzzle
  move: unknown; // serialized game move payload
  msSinceStart: number;
}

export interface PuzzleEnded extends BaseEvent {
  type: 'puzzle_ended';
  outcome: TraceOutcome;
  moves: number;
  optimalMoves: number;
  seconds: number;
  score: number; // scoreOutcome(...) ∈ [0,1]
}

export type TraceEvent = PuzzleStarted | MoveEvent | PuzzleEnded;

export const makePuzzleId = (sessionId: string, index: number): string => `${sessionId}:${index}`;
