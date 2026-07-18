import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchTelemetry,
  computeDashboard,
  type TelemetryEvent,
  type PuzzleStarted,
  type PuzzleEnded,
  type MoveEvent,
} from './dashboard';

// ── Helpers to build test fixtures ─────────────────────────────────────────

let nextTs = 1_700_000_000_000;
function ts(): number { return nextTs++; }

const REAL_SESSION = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const TEST_SESSION = 'test-session'; // != 5 dashes → filtered

function started(overrides: Partial<PuzzleStarted> = {}): PuzzleStarted {
  return {
    type: 'puzzle_started',
    sessionId: REAL_SESSION,
    puzzleId: `puz-${ts()}`,
    ts: ts(),
    gameId: 'binPacking',
    category: 'assignment',
    difficulty: 3,
    genSeed: 42,
    optimalMoves: 5,
    ...overrides,
  };
}

function ended(overrides: Partial<PuzzleEnded> = {}): PuzzleEnded {
  return {
    type: 'puzzle_ended',
    sessionId: REAL_SESSION,
    puzzleId: '',
    ts: ts(),
    outcome: 'solved',
    moves: 5,
    optimalMoves: 5,
    seconds: 12,
    score: 100,
    ...overrides,
  };
}

function move(overrides: Partial<MoveEvent> = {}): MoveEvent {
  return {
    type: 'move',
    sessionId: REAL_SESSION,
    puzzleId: '',
    ts: ts(),
    moveIndex: 0,
    move: {},
    msSinceStart: 100,
    ...overrides,
  };
}

function pair(
  overrides: Partial<PuzzleStarted> = {},
  endOverrides: Partial<PuzzleEnded> = {},
): TelemetryEvent[] {
  const s = started(overrides);
  const e = ended({ puzzleId: s.puzzleId, sessionId: s.sessionId, ...endOverrides });
  return [s, e];
}

// ── fetchTelemetry ──────────────────────────────────────────────────────────

describe('fetchTelemetry', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('parses JSONL into TelemetryEvent array', async () => {
    const body = [
      JSON.stringify(started()),
      JSON.stringify(ended()),
    ].join('\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(body),
    }));

    const events = await fetchTelemetry('http://test');
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('puzzle_started');
    expect(events[1].type).toBe('puzzle_ended');
  });

  it('throws on non-2xx status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: () => Promise.resolve('bad gateway'),
    }));

    await expect(fetchTelemetry('http://test')).rejects.toThrow('pip-ingest returned 502');
  });

  it('handles empty body gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
    }));

    const events = await fetchTelemetry('http://test');
    expect(events).toEqual([]);
  });
});

// ── computeDashboard ────────────────────────────────────────────────────────

describe('computeDashboard', () => {
  it('returns empty dashboard for no events', () => {
    const d = computeDashboard([]);
    expect(d.games).toEqual([]);
    expect(d.players).toEqual([]);
    expect(d.trend).toEqual([]);
    expect(d.totalSessions).toBe(0);
    expect(d.totalEvents).toBe(0);
  });

  it('counts a solved puzzle', () => {
    const events = pair();
    const d = computeDashboard(events);
    expect(d.games).toHaveLength(1);
    expect(d.games[0].solved).toBe(1);
    expect(d.games[0].abandoned).toBe(0);
    expect(d.games[0].attempts).toBe(1);
  });

  it('counts an abandoned puzzle', () => {
    const events = pair({}, { outcome: 'abandoned' });
    const d = computeDashboard(events);
    expect(d.games[0].abandoned).toBe(1);
    expect(d.games[0].solved).toBe(0);
  });

  it('counts a failed puzzle', () => {
    const events = pair({}, { outcome: 'failed' });
    const d = computeDashboard(events);
    expect(d.games[0].failed).toBe(1);
  });

  it('counts a skipped puzzle (started but no end)', () => {
    const s = started();
    const d = computeDashboard([s]);
    expect(d.games[0].skipped).toBe(1);
  });

  it('drops test sessions', () => {
    const testStart = started({ sessionId: TEST_SESSION });
    const testEnd = ended({ sessionId: TEST_SESSION, puzzleId: testStart.puzzleId });
    const realStart = started();
    const realEnd = ended({ puzzleId: realStart.puzzleId });

    const d = computeDashboard([testStart, testEnd, realStart, realEnd]);
    expect(d.totalSessions).toBe(1);
    expect(d.games).toHaveLength(1);
  });

  it('groups by gameId across multiple puzzles', () => {
    const e1 = pair({ puzzleId: 'p1' });
    const e2 = pair({ puzzleId: 'p2' });
    // Fix puzzleId on ended events
    (e1[1] as PuzzleEnded).puzzleId = 'p1';
    (e2[1] as PuzzleEnded).puzzleId = 'p2';

    const d = computeDashboard([...e1, ...e2]);
    expect(d.games).toHaveLength(1);
    expect(d.games[0].solved).toBe(2);
    expect(d.games[0].attempts).toBe(2);
  });

  it('tracks optimal solves (moves === optimalMoves)', () => {
    const events = pair({}, { moves: 5, optimalMoves: 5 });
    const d = computeDashboard(events);
    expect(d.games[0].optimalSolves).toBe(1);
  });

  it('does not count non-optimal solves as optimal', () => {
    const events = pair({}, { moves: 8, optimalMoves: 5 });
    const d = computeDashboard(events);
    expect(d.games[0].optimalSolves).toBe(0);
  });

  it('computes p50/p90 solve times', () => {
    const all: TelemetryEvent[] = [];
    for (let i = 0; i < 10; i++) {
      const s = started({ puzzleId: `p${i}` });
      const e = ended({ puzzleId: s.puzzleId, seconds: (i + 1) * 10 });
      all.push(s, e);
    }
    const d = computeDashboard(all);
    expect(d.games[0].p50Seconds).not.toBeNull();
    expect(d.games[0].p90Seconds).not.toBeNull();
    expect(d.games[0].p50Seconds!).toBeLessThanOrEqual(d.games[0].p90Seconds!);
  });

  it('computes difficulty breakdown', () => {
    const all: TelemetryEvent[] = [];
    for (const diff of [1, 2, 3]) {
      const s = started({ puzzleId: `d${diff}`, difficulty: diff });
      const e = ended({ puzzleId: s.puzzleId });
      all.push(s, e);
    }
    const d = computeDashboard(all);
    const bd = d.games[0].difficultyBreakdown;
    expect(bd).toHaveLength(3);
    expect(bd.map((b) => b.d)).toEqual([1, 2, 3]);
    expect(bd.every((b) => b.solved === 1)).toBe(true);
  });

  it('computes monotonicity with >=3 valid difficulty buckets', () => {
    const all: TelemetryEvent[] = [];
    // Build a scenario where higher difficulty → lower success rate
    for (const diff of [1, 2, 3]) {
      for (let j = 0; j < 3; j++) {
        const s = started({ puzzleId: `d${diff}-${j}`, difficulty: diff });
        if (diff === 1) {
          all.push(s, ended({ puzzleId: s.puzzleId, outcome: 'solved' }));
        } else if (diff === 2 && j < 2) {
          all.push(s, ended({ puzzleId: s.puzzleId, outcome: 'solved' }));
        } else if (diff === 2 && j === 2) {
          all.push(s, ended({ puzzleId: s.puzzleId, outcome: 'abandoned' }));
        } else {
          all.push(s, ended({ puzzleId: s.puzzleId, outcome: 'abandoned' }));
        }
      }
    }
    const d = computeDashboard(all);
    // With a downward trend in success, ρ should be negative
    expect(d.games[0].monotonicity).not.toBeNull();
    expect(d.games[0].monotonicity!).toBeLessThan(0);
  });

  it('returns null monotonicity when <3 valid buckets', () => {
    const events = pair({ difficulty: 1 });
    const d = computeDashboard(events);
    expect(d.games[0].monotonicity).toBeNull();
  });

  it('builds player summaries', () => {
    const sid1 = 'aaaa1111-bbbb-2222-cccc-3333dddd4444';
    const sid2 = 'bbbb5555-cccc-6666-dddd-7777eeee8888';
    const e1 = pair({ sessionId: sid1, puzzleId: 'p1' });
    ((e1[1] as PuzzleEnded)).puzzleId = 'p1';
    const e2 = pair({ sessionId: sid2, puzzleId: 'p2' }, { outcome: 'abandoned' });
    ((e2[1] as PuzzleEnded)).puzzleId = 'p2';

    const d = computeDashboard([...e1, ...e2]);
    expect(d.players).toHaveLength(2);
    expect(d.totalSessions).toBe(2);
  });

  it('builds trend data grouped by date', () => {
    const day1Ts = new Date('2026-06-01T12:00:00Z').getTime();
    const day2Ts = new Date('2026-06-02T12:00:00Z').getTime();
    const s1 = started({ puzzleId: 't1', ts: day1Ts });
    const e1 = ended({ puzzleId: 't1', ts: day1Ts + 5000 });
    const s2 = started({ puzzleId: 't2', ts: day2Ts });
    const e2 = ended({ puzzleId: 't2', ts: day2Ts + 5000, outcome: 'abandoned' });

    const d = computeDashboard([s1, e1, s2, e2]);
    expect(d.trend).toHaveLength(2);
    expect(d.trend[0].date).toBe('2026-06-01');
    expect(d.trend[0].puzzlesStarted).toBe(1);
    expect(d.trend[0].puzzlesSolved).toBe(1);
    expect(d.trend[1].date).toBe('2026-06-02');
    expect(d.trend[1].puzzlesSolved).toBe(0);
  });

  it('tracks post-solve moves (integrity check)', () => {
    const s = started({ puzzleId: 'int1' });
    const e = ended({ puzzleId: 'int1', moves: 5, optimalMoves: 5 });
    // 7 move events for a puzzle that was solved in 5 moves → 2 post-solve
    const moves: MoveEvent[] = [];
    for (let i = 0; i < 7; i++) {
      moves.push(move({ puzzleId: 'int1', moveIndex: i }));
    }
    const d = computeDashboard([s, e, ...moves]);
    expect(d.games[0].postSolveMoves).toBe(2);
  });

  it('counts unique sessions per game', () => {
    const sid1 = 'aaaa1111-bbbb-2222-cccc-3333dddd4444';
    const sid2 = 'bbbb5555-cccc-6666-dddd-7777eeee8888';
    const s1 = started({ sessionId: sid1, puzzleId: 'u1' });
    const e1 = ended({ puzzleId: 'u1', sessionId: sid1 });
    const s2 = started({ sessionId: sid2, puzzleId: 'u2' });
    const e2 = ended({ puzzleId: 'u2', sessionId: sid2 });

    const d = computeDashboard([s1, e1, s2, e2]);
    expect(d.games[0].sessions).toBe(2);
  });

  it('sorts games by attempts descending', () => {
    const e1 = pair({ gameId: 'gameA', puzzleId: 'a1' });
    (e1[1] as PuzzleEnded).puzzleId = 'a1';
    const d = computeDashboard([
      ...pair({ gameId: 'gameB', puzzleId: 'b1' }),
      ...pair({ gameId: 'gameB', puzzleId: 'b2' }),
      ...e1,
    ]);
    // Fix puzzleIds
    const b1 = started({ gameId: 'gameB', puzzleId: 'b1' });
    const b1e = ended({ puzzleId: 'b1' });
    const b2 = started({ gameId: 'gameB', puzzleId: 'b2' });
    const b2e = ended({ puzzleId: 'b2' });
    const a1 = started({ gameId: 'gameA', puzzleId: 'a1' });
    const a1e = ended({ puzzleId: 'a1' });

    const d2 = computeDashboard([b1, b1e, b2, b2e, a1, a1e]);
    expect(d2.games[0].gameId).toBe('gameB');
    expect(d2.games[1].gameId).toBe('gameA');
  });
});
