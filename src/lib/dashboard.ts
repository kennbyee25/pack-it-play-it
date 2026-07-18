// ── Telemetry types (mirrors the pip-ingest JSONL schema) ────────────────

export interface PuzzleStarted {
  type: 'puzzle_started';
  sessionId: string;
  puzzleId: string;
  ts: number;
  gameId: string;
  category: string;
  difficulty: number;
  genSeed: number;
  optimalMoves: number;
}

export interface MoveEvent {
  type: 'move';
  sessionId: string;
  puzzleId: string;
  ts: number;
  moveIndex: number;
  move: Record<string, unknown>;
  msSinceStart: number;
}

export interface PuzzleEnded {
  type: 'puzzle_ended';
  sessionId: string;
  puzzleId: string;
  ts: number;
  outcome: 'solved' | 'abandoned' | 'failed';
  moves: number;
  optimalMoves: number;
  seconds: number;
  score: number;
}

export type TelemetryEvent = PuzzleStarted | MoveEvent | PuzzleEnded;

// ── Derived stats types ──────────────────────────────────────────────────

export interface GameHealth {
  gameId: string;
  category: string;
  attempts: number;
  sessions: number;
  solved: number;
  abandoned: number;
  failed: number;
  skipped: number; // started a puzzle but never ended it
  optimalSolves: number;
  p50Seconds: number | null;
  p90Seconds: number | null;
  postSolveMoves: number;
  difficultyBreakdown: { d: number; total: number; solved: number; quit: number }[];
  /** Spearman ρ between difficulty and success rate across breakdown buckets */
  monotonicity: number | null;
}

export interface PlayerSummary {
  sessionId: string;
  totalPuzzles: number;
  solved: number;
  skipped: number;
  gamesPlayed: string[];
}

export interface TrendPoint {
  /** Date string YYYY-MM-DD derived from the first event timestamp of a session */
  date: string;
  puzzlesStarted: number;
  puzzlesSolved: number;
  puzzlesSkipped: number;
  activeSessions: number;
}

export interface DashboardData {
  games: GameHealth[];
  players: PlayerSummary[];
  trend: TrendPoint[];
  totalSessions: number;
  totalEvents: number;
  loadedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────

const PIP_INGEST_URL = 'https://pip-ingest.tail7a0e03.ts.net/export';

// ── Fetch + parse ────────────────────────────────────────────────────────

export async function fetchTelemetry(url = PIP_INGEST_URL): Promise<TelemetryEvent[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`pip-ingest returned ${res.status}`);
  const text = await res.text();
  return text
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TelemetryEvent);
}

// ── Stats computation ────────────────────────────────────────────────────

function isTestSession(sid: string): boolean {
  return sid.split('-').length !== 5;
}

function percentile(xs: number[], q: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.round(q * (s.length - 1)));
  return s[i];
}

/** Quick Spearman rank correlation between two arrays of equal length. */
function spearmanRank(a: number[], b: number[]): number | null {
  const n = a.length;
  if (n < 3 || a.length !== b.length) return null;
  const rank = (arr: number[]): number[] => {
    const idx = arr.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0]);
    const r = new Array<number>(n);
    idx.forEach(([, i], ri) => { r[i] = ri; });
    return r;
  };
  const ra = rank(a), rb = rank(b);
  const d2 = ra.reduce((s, _, i) => s + (ra[i] - rb[i]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

export function computeDashboard(events: TelemetryEvent[]): DashboardData {
  // Index events by puzzleId
  const starts = new Map<string, PuzzleStarted>();
  const ends = new Map<string, PuzzleEnded>();
  const movesByPuzzle = new Map<string, MoveEvent[]>();

  for (const e of events) {
    const pid = e.puzzleId;
    if (!pid) continue;
    if (e.type === 'puzzle_started') starts.set(pid, e);
    else if (e.type === 'puzzle_ended') ends.set(pid, e);
    else if (e.type === 'move') {
      const m = movesByPuzzle.get(pid) ?? [];
      m.push(e);
      movesByPuzzle.set(pid, m);
    }
  }

  // Drop test sessions
  const testSessions = new Set<string>();
  for (const [pid, s] of starts) {
    if (isTestSession(s.sessionId)) testSessions.add(s.sessionId);
  }
  for (const sid of testSessions) {
    for (const [pid, s] of starts) {
      if (s.sessionId === sid) starts.delete(pid);
    }
    for (const [pid, e] of ends) {
      if (e.sessionId === sid) ends.delete(pid);
    }
  }

  // Build per-game stats
  const gameAttempts = new Map<string, {
    sessions: Set<string>;
    solved: number;
    abandoned: number;
    failed: number;
    skipped: number;
    optimal: number;
    seconds: number[];
    postSolve: number;
    diffBuckets: Map<number, { total: number; solved: number; quit: number }>;
  }>();

  // All puzzle IDs (including skipped ones)
  const allPids = new Set([...starts.keys(), ...ends.keys()]);

  for (const pid of allPids) {
    const s = starts.get(pid)!; // at minimum we need a start to attribute to a game
    if (!s) continue;
    const gid = s.gameId;
    let rec = gameAttempts.get(gid);
    if (!rec) {
      rec = { sessions: new Set(), solved: 0, abandoned: 0, failed: 0, skipped: 0, optimal: 0, seconds: [], postSolve: 0, diffBuckets: new Map() };
      gameAttempts.set(gid, rec);
    }
    rec.sessions.add(s.sessionId);

    const diff = s.difficulty;
    let db = rec.diffBuckets.get(diff);
    if (!db) { db = { total: 0, solved: 0, quit: 0 }; rec.diffBuckets.set(diff, db); }
    db.total++;

    const e = ends.get(pid);
    if (!e) {
      rec.skipped++;
      db.quit++;
      continue;
    }

    if (e.outcome === 'solved') {
      rec.solved++;
      db.solved++;
      rec.seconds.push(e.seconds);
      if (e.moves === e.optimalMoves) rec.optimal++;
      // post-solve moves: move events beyond ended_moves
      const moveEvents = movesByPuzzle.get(pid) ?? [];
      const post = Math.max(0, moveEvents.length - e.moves);
      rec.postSolve += post;
    } else if (e.outcome === 'abandoned') {
      rec.abandoned++;
      db.quit++;
    } else if (e.outcome === 'failed') {
      rec.failed++;
      db.quit++;
    }
  }

  // Build GameHealth array
  const games: GameHealth[] = [];
  for (const [gameId, rec] of gameAttempts) {
    const diffEntries = [...rec.diffBuckets.entries()]
      .map(([d, b]) => ({ d, total: b.total, solved: b.solved, quit: b.quit }))
      .sort((a, b) => a.d - b.d);

    // Monotonicity: correlation between difficulty and success rate across buckets with >=2 attempts
    const valid = diffEntries.filter((x) => x.total >= 2);
    let rho: number | null = null;
    if (valid.length >= 3) {
      const ds = valid.map((x) => x.d);
      const rates = valid.map((x) => x.solved / x.total);
      rho = spearmanRank(ds, rates);
    }

    games.push({
      gameId,
      category: '',
      attempts: rec.solved + rec.abandoned + rec.failed + rec.skipped,
      sessions: rec.sessions.size,
      solved: rec.solved,
      abandoned: rec.abandoned,
      failed: rec.failed,
      skipped: rec.skipped,
      optimalSolves: rec.optimal,
      p50Seconds: percentile(rec.seconds, 0.5),
      p90Seconds: percentile(rec.seconds, 0.9),
      postSolveMoves: rec.postSolve,
      difficultyBreakdown: diffEntries,
      monotonicity: rho,
    });
  }

  // Fill categories from the first puzzle_started we saw for each game
  for (const [pid, s] of starts) {
    const g = games.find((g) => g.gameId === s.gameId);
    if (g && !g.category) g.category = s.category;
  }
  games.sort((a, b) => b.attempts - a.attempts);

  // Player summaries
  const sessionData = new Map<string, { puzzles: Set<string>; solved: number; skipped: number; games: Set<string> }>();
  for (const pid of allPids) {
    const s = starts.get(pid);
    if (!s) continue;
    let rec = sessionData.get(s.sessionId);
    if (!rec) { rec = { puzzles: new Set(), solved: 0, skipped: 0, games: new Set() }; sessionData.set(s.sessionId, rec); }
    rec.puzzles.add(pid);
    rec.games.add(s.gameId);
    const e = ends.get(pid);
    if (!e) rec.skipped++;
    else if (e.outcome === 'solved') rec.solved++;
  }
  const players: PlayerSummary[] = [];
  for (const [sessionId, rec] of sessionData) {
    players.push({ sessionId, totalPuzzles: rec.puzzles.size, solved: rec.solved, skipped: rec.skipped, gamesPlayed: [...rec.games].sort() });
  }
  players.sort((a, b) => b.totalPuzzles - a.totalPuzzles);

  // Trend: group sessions by day of first event
  const daySessions = new Map<string, { ids: Set<string>; puzzles: number; solved: number; skipped: number }>();
  for (const [pid, s] of starts) {
    const date = new Date(s.ts).toISOString().slice(0, 10);
    let rec = daySessions.get(date);
    if (!rec) { rec = { ids: new Set(), puzzles: 0, solved: 0, skipped: 0 }; daySessions.set(date, rec); }
    rec.ids.add(s.sessionId);
    rec.puzzles++;
    const e = ends.get(pid);
    if (!e) rec.skipped++;
    else if (e.outcome === 'solved') rec.solved++;
  }
  const trend: TrendPoint[] = [...daySessions.entries()]
    .map(([date, rec]) => ({ date, puzzlesStarted: rec.puzzles, puzzlesSolved: rec.solved, puzzlesSkipped: rec.skipped, activeSessions: rec.ids.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    games,
    players,
    trend,
    totalSessions: sessionData.size,
    totalEvents: events.length,
    loadedAt: new Date().toISOString(),
  };
}
