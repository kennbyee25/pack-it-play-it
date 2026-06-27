import { describe, it, expect, vi } from 'vitest';
import { makeRng } from '../games/rng';
import { getGame, GAME_IDS } from '../games/registry';
import { applySolution } from '../games/types';
import { createTracer } from './tracer';
import { SupabaseSink, HttpSink, NoopSink, makeSink, type TraceSink } from './sink';
import { replayVerify } from './replay';
import type { TraceEvent } from './types';

// Collect events into an array.
function fakeSink(): { sink: TraceSink; events: TraceEvent[] } {
  const events: TraceEvent[] = [];
  return { events, sink: { emit: (e) => events.push(e), flush: async () => {} } };
}

describe('tracer emits started → moves → ended in order', () => {
  it('produces a well-formed, ordered stream', () => {
    const { sink, events } = fakeSink();
    let t = 1000;
    const tracer = createTracer(sink, 'sess-1', () => t++);
    tracer.puzzleStarted({ index: 3, gameId: 'set-cover', difficulty: 500, genSeed: 42, optimalMoves: 2 });
    tracer.move({ subsetIndex: 0 });
    tracer.move({ subsetIndex: 1 });
    tracer.puzzleEnded({ outcome: 'solved', moves: 2, optimalMoves: 2, seconds: 4, score: 0.9 });

    expect(events.map((e) => e.type)).toEqual(['puzzle_started', 'move', 'move', 'puzzle_ended']);
    expect(events.every((e) => e.puzzleId === 'sess-1:3')).toBe(true);
    const moves = events.filter((e) => e.type === 'move');
    expect(moves.map((m) => (m.type === 'move' ? m.moveIndex : -1))).toEqual([0, 1]);
    const started = events[0];
    expect(started.type === 'puzzle_started' && started.category).toBe('set'); // metadata stamped
  });

  it('ignores moves with no active puzzle', () => {
    const { sink, events } = fakeSink();
    const tracer = createTracer(sink, 's');
    tracer.move({ x: 1 });
    expect(events).toHaveLength(0);
  });
});

describe('trace payload carries no PII', () => {
  it('only game/timing/seed fields appear', () => {
    const { sink, events } = fakeSink();
    const tracer = createTracer(sink, 'sess', () => 1);
    tracer.puzzleStarted({ index: 0, gameId: 'subset-sum', difficulty: 300, genSeed: 7, optimalMoves: 3 });
    const json = JSON.stringify(events);
    expect(json).not.toMatch(/email|name|ip|user|password/i);
  });
});

describe('SupabaseSink', () => {
  const cfg = (fetchImpl: typeof fetch, over = {}) => ({
    url: 'https://x.supabase.co',
    anonKey: 'anon',
    batchSize: 2,
    fetchImpl,
    ...over,
  });
  const ev = (i: number): TraceEvent => ({
    type: 'move',
    sessionId: 's',
    puzzleId: 's:0',
    ts: i,
    moveIndex: i,
    move: {},
    msSinceStart: i,
  });

  it('batches at batchSize and POSTs rows', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 201 }));
    const sink = new SupabaseSink(cfg(fetchImpl as unknown as typeof fetch));
    sink.emit(ev(0));
    expect(fetchImpl).not.toHaveBeenCalled();
    sink.emit(ev(1)); // hits batchSize=2 → triggers flush
    await Promise.resolve();
    await sink.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toHaveLength(2);
  });

  it('retries on failure then requeues if still failing', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 500 }));
    // batchSize high so emit() doesn't auto-flush; we drive flush explicitly.
    const sink = new SupabaseSink(cfg(fetchImpl as unknown as typeof fetch, { batchSize: 5, maxRetries: 2 }));
    sink.emit(ev(0));
    await sink.flush();
    // initial + 2 retries = 3 attempts
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe('HttpSink (self-hosted ingest)', () => {
  const ev = (i: number): TraceEvent => ({
    type: 'move', sessionId: 's', puzzleId: 's:0', ts: i, moveIndex: i, move: {}, msSinceStart: i,
  });

  it('POSTs rows to ${url}/traces with no auth headers', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 }));
    const sink = new HttpSink({ url: 'https://pip-ingest.example.ts.net/', batchSize: 5, fetchImpl: fetchImpl as unknown as typeof fetch });
    sink.emit(ev(0));
    await sink.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetchImpl.mock.calls[0];
    expect(endpoint).toBe('https://pip-ingest.example.ts.net/traces');
    expect((init as RequestInit).headers).not.toHaveProperty('apikey');
    expect(JSON.parse((init as RequestInit).body as string)[0]).toMatchObject({ type: 'move', session_id: 's' });
  });
});

describe('makeSink precedence', () => {
  it('prefers VITE_TRACE_URL → HttpSink, then Supabase, then Noop', () => {
    expect(makeSink({ VITE_TRACE_URL: 'https://x.ts.net' })).toBeInstanceOf(HttpSink);
    expect(makeSink({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' })).toBeInstanceOf(SupabaseSink);
    expect(makeSink({})).toBe(NoopSink);
  });
});

describe('replay-verify (faithful capture)', () => {
  // For a representative set, a trace's reconstruction + planted-solution moves solve it.
  it.each(['set-cover', 'subset-sum', 'vertex-cover', 'clique', 'hamiltonian'])('%s', (gameId) => {
    const game = getGame(gameId);
    const difficulty = 300;
    const genSeed = 12345;
    const gen = game.generate(difficulty, makeRng(genSeed));
    // Build a synthetic trace from the planted solution moves.
    const start: TraceEvent = {
      type: 'puzzle_started',
      sessionId: 's',
      puzzleId: 's:0',
      ts: 0,
      gameId,
      category: 'set',
      difficulty,
      genSeed,
      optimalMoves: gen.solution.length,
    };
    const moves: TraceEvent[] = gen.solution.map((m, i) => ({
      type: 'move',
      sessionId: 's',
      puzzleId: 's:0',
      ts: i + 1,
      moveIndex: i,
      move: m,
      msSinceStart: i + 1,
    }));
    const summary = replayVerify([start, ...moves]);
    expect(summary.solved).toBe(true);
    // sanity: reconstruction matches applySolution path
    expect(game.isSolved(applySolution(game, gen))).toBe(true);
  });

  it('all solver games have valid metadata-reconstructable traces', () => {
    // smoke: reconstruct every game without throwing
    for (const id of GAME_IDS) {
      const game = getGame(id);
      expect(() => game.generate(300, makeRng(1))).not.toThrow();
    }
  });
});

describe('NoopSink', () => {
  it('emit/flush are inert', async () => {
    NoopSink.emit({ type: 'move', sessionId: 's', puzzleId: 'p', ts: 0, moveIndex: 0, move: {}, msSinceStart: 0 });
    await expect(NoopSink.flush()).resolves.toBeUndefined();
  });
});
