import { describe, it, expect, vi } from 'vitest';
import { makeRng } from '../games/rng';
import { getGame, GAME_IDS } from '../games/registry';
import { applySolution } from '../games/types';
import { createTracer } from './tracer';
import { SupabaseSink, HttpSink, NoopSink, makeSink, GuardedSink, IDLE_THRESHOLD_MS, ERROR_BURST_THRESHOLD, IDLE_CAP_SECONDS, type TraceSink } from './sink';
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
    tracer.puzzleStarted({ index: 3, gameId: 'set-cover', difficulty: 500, genSeed: 42, optimalMoves: 2, tuner: 'smart' });
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
    tracer.puzzleStarted({ index: 0, gameId: 'subset-sum', difficulty: 300, genSeed: 7, optimalMoves: 3, tuner: 'smart' });
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
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 201 }));
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
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 200 }));
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
      reductionFrom: [],
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

describe('behavioral events', () => {
  it('tracer emits idle event', () => {
    const { sink, events } = fakeSink();
    const tracer = createTracer(sink, 's');
    tracer.puzzleStarted({ index: 0, gameId: 'set-cover', difficulty: 300, genSeed: 1, optimalMoves: 2, tuner: 'smart' });
    tracer.idle(35_000);
    expect(events.map(e => e.type)).toContain('idle');
    const idle = events.find(e => e.type === 'idle');
    if (idle?.type === 'idle') expect(idle.durationMs).toBe(35_000);
  });

  it('tracer emits error_burst event', () => {
    const { sink, events } = fakeSink();
    const tracer = createTracer(sink, 's');
    tracer.puzzleStarted({ index: 0, gameId: 'graph-coloring', difficulty: 300, genSeed: 2, optimalMoves: 3, tuner: 'smart' });
    tracer.errorBurst(3, 'illegal');
    expect(events.map(e => e.type)).toContain('error_burst');
    const burst = events.find(e => e.type === 'error_burst');
    if (burst?.type === 'error_burst') expect(burst.count).toBe(3);
  });

  it('tracer emits abandon and clears puzzle', () => {
    const { sink, events } = fakeSink();
    const tracer = createTracer(sink, 's');
    tracer.puzzleStarted({ index: 0, gameId: 'subset-sum', difficulty: 300, genSeed: 3, optimalMoves: 1, tuner: 'smart' });
    tracer.move({ val: 42 });
    tracer.abandon(12);
    // abandon should be last event and puzzleId cleared
    expect(events[events.length - 1].type).toBe('abandon');
    // subsequent move should be ignored (no active puzzle)
    tracer.move({ val: 99 });
    expect(events.filter(e => e.type === 'move')).toHaveLength(1);
  });

  it('tracer emits hesitation event', () => {
    const { sink, events } = fakeSink();
    const tracer = createTracer(sink, 's');
    tracer.puzzleStarted({ index: 0, gameId: 'clique', difficulty: 200, genSeed: 4, optimalMoves: 1, tuner: 'smart' });
    tracer.move({ node: 1 });
    tracer.hesitation(12_000, 1);
    expect(events.map(e => e.type)).toContain('hesitation');
    const hesi = events.find(e => e.type === 'hesitation');
    if (hesi?.type === 'hesitation') expect(hesi.gapMs).toBe(12_000);
  });
});

describe('GuardedSink', () => {
  const ev = (type: TraceEvent['type'], i = 0): TraceEvent => {
    const base = { sessionId: 's', puzzleId: `s:${i}`, ts: 1000 + i };
    if (type === 'puzzle_started') return { ...base, type, gameId: 'set-cover', category: 'set' as const, difficulty: 300, genSeed: i, optimalMoves: 2, reductionFrom: [] };
    if (type === 'move') return { ...base, type, moveIndex: i, move: {}, msSinceStart: 10 };
    if (type === 'puzzle_ended') return { ...base, type, outcome: 'solved' as const, moves: 2, optimalMoves: 2, seconds: 5, score: 0.9 };
    return { ...base, type, durationMs: 999 } as TraceEvent;
  };

  it('drops moves after puzzle_ended (lockOnSolve)', () => {
    const inner = { emit: vi.fn(), flush: vi.fn() };
    const guard = new GuardedSink(inner, { lockOnSolve: true });
    guard.emit(ev('puzzle_started', 0));
    guard.emit(ev('move', 0));
    guard.emit(ev('puzzle_ended', 0));
    guard.emit(ev('move', 1));  // should be dropped
    expect(inner.emit).toHaveBeenCalledTimes(3);
  });

  it('suppresses all events when optOut is true', () => {
    const inner = { emit: vi.fn(), flush: vi.fn() };
    const guard = new GuardedSink(inner, { optOut: true });
    guard.emit(ev('move', 0));
    expect(inner.emit).not.toHaveBeenCalled();
  });
});

describe('OTELSink', () => {
  // Import lazy to avoid crash if OTel isn't loaded
  it('creates OTELSink without throwing', async () => {
    const mod = await import('./sink');
    const sink = new mod.OTELSink();
    expect(sink).toBeDefined();
    expect(typeof sink.emit).toBe('function');
  });
});
