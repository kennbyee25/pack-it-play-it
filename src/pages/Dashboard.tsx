import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ScatterChart, Scatter, Cell,
} from 'recharts';
import { fetchTelemetry, computeDashboard, type DashboardData, type TelemetryEvent } from '@/lib/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, TrendingUp, Users, Puzzle, Brain, BarChart3, Activity } from 'lucide-react';

// ── Colors for game charts ──────────────────────────────────────────────
const GAME_COLORS = [
  '#5dacdf', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#d946ef', '#eab308', '#3b82f6', '#a855f7',
  '#22c55e', '#f43f5e', '#0ea5e9', '#ca8a04', '#64748b',
];

function gameColor(i: number): string { return GAME_COLORS[i % GAME_COLORS.length]; }

function pct(n: number, d: number): string {
  if (!d) return '—';
  return `${(100 * n / d).toFixed(0)}%`;
}

// ── Summary stat card ───────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Game health badge ───────────────────────────────────────────────────
function HealthBadge({ game }: { game: DashboardData['games'][number] }) {
  const quitRate = game.attempts ? (game.abandoned + game.failed + game.skipped) / game.attempts : 0;
  const integrityWarn = game.postSolveMoves > 0;
  const monotoneWarn = game.monotonicity !== null && game.monotonicity > -0.3;

  const warnings: string[] = [];
  if (quitRate > 0.3) warnings.push('high-quit');
  if (integrityWarn) warnings.push('post-solve');
  if (monotoneWarn) warnings.push('flat-knob');

  if (warnings.length === 0) return <Badge variant="secondary">ok</Badge>;
  return (
    <div className="flex gap-1 flex-wrap">
      {warnings.includes('high-quit') && <Badge variant="destructive">high quit</Badge>}
      {warnings.includes('post-solve') && <Badge variant="secondary">post-solve</Badge>}
      {warnings.includes('flat-knob') && <Badge variant="outline">flat knob</Badge>}
    </div>
  );
}

// ── Main dashboard ──────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ev = await fetchTelemetry();
      setEvents(ev);
      setData(computeDashboard(ev));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load telemetry');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-muted-foreground">
          <Activity className="w-8 h-8 animate-pulse mx-auto mb-2" />
          <p>Loading telemetry from pip-ingest…</p>
          <p className="text-xs mt-2">Requires Tailscale / internal network</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="font-medium">Could not load dashboard</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <p className="text-xs text-muted-foreground mt-3">
            The dashboard fetches game telemetry from pip-ingest (Tailscale).
            Make sure you are on the tailnet.
          </p>
          <button
            onClick={load}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalAttempts = data.games.reduce((s, g) => s + g.attempts, 0);
  const totalSolves = data.games.reduce((s, g) => s + g.solved, 0);
  const totalQuits = data.games.reduce((s, g) => s + g.abandoned + g.failed + g.skipped, 0);
  const totalOptimal = data.games.reduce((s, g) => s + g.optimalSolves, 0);
  const skipRate = totalAttempts ? `${(100 * totalQuits / totalAttempts).toFixed(0)}%` : '—';
  const optimalRate = totalSolves ? `${(100 * totalOptimal / totalSolves).toFixed(0)}%` : '—';

  // Charts data
  const popChart = data.games.map((g, i) => ({
    name: g.gameId,
    attempts: g.attempts,
    solves: g.solved,
    quits: g.abandoned + g.failed + g.skipped,
    fill: gameColor(i),
  }));

  const quitChart = data.games
    .map((g) => ({
      name: g.gameId,
      quitRate: g.attempts ? +((g.abandoned + g.failed + g.skipped) / g.attempts * 100).toFixed(1) : 0,
      attempts: g.attempts,
    }))
    .filter((g) => g.attempts >= 3)
    .sort((a, b) => b.quitRate - a.quitRate);

  const timeChart = data.games
    .filter((g) => g.p50Seconds != null)
    .map((g, i) => ({
      name: g.gameId,
      p50: g.p50Seconds ?? 0,
      p90: g.p90Seconds ?? 0,
      fill: gameColor(i),
    }))
    .sort((a, b) => b.p90 - a.p90);

  // Difficulty scatter data
  const diffScatter: { game: string; x: number; y: number; success: number; fill: string }[] = [];
  data.games.forEach((g, gi) => {
    g.difficultyBreakdown.forEach((b) => {
      if (b.total >= 1) {
        diffScatter.push({
          game: g.gameId,
          x: b.d,
          y: b.total > 0 ? b.solved / b.total : 0,
          success: b.solved,
          fill: gameColor(gi),
        });
      }
    });
  });

  // Players with warnings
  const flaggedPlayers = data.players.filter((p) => p.skipped > 2);

  // Integrity chart
  const integrityData = data.games
    .filter((g) => g.postSolveMoves > 0)
    .map((g, i) => ({ name: g.gameId, postSolve: g.postSolveMoves, fill: gameColor(i) }))
    .sort((a, b) => b.postSolve - a.postSolve);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Game Analytics</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{data.totalEvents} events</span>
          <span>·</span>
          <span>{data.totalSessions} sessions</span>
          <span>·</span>
          <span>loaded {new Date(data.loadedAt).toLocaleTimeString()}</span>
          <button onClick={load} className="text-primary hover:underline">refresh</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Puzzle className="w-4 h-4 text-muted-foreground" />} label="Puzzles Attempted" value={totalAttempts.toLocaleString()} sub={`across ${data.games.length} games`} />
        <StatCard icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />} label="Solve Rate" value={skipRate} sub={`${totalSolves} solved, ${totalQuits} quits`} />
        <StatCard icon={<Brain className="w-4 h-4 text-muted-foreground" />} label="Optimal Solves" value={optimalRate} sub={`${totalOptimal} of ${totalSolves} solves`} />
        <StatCard icon={<Users className="w-4 h-4 text-muted-foreground" />} label="Unique Sessions" value={data.totalSessions.toLocaleString()} sub={flaggedPlayers.length > 0 ? `${flaggedPlayers.length} high-skip` : undefined} />
      </div>

      {/* Main content tabs */}
      <Tabs defaultValue="games" className="space-y-4">
        <TabsList>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="difficulty">Difficulty</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="integrity">Integrity</TabsTrigger>
        </TabsList>

        {/* ── Games tab ─────────────────────────────────── */}
        <TabsContent value="games" className="space-y-4">
          {/* Popularity bar chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">Play Count by Game</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={popChart} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="attempts" name="Attempts" stackId="a" fill="#5dacdf" />
                  <Bar dataKey="solves" name="Solves" stackId="a" fill="#10b981" />
                  <Bar dataKey="quits" name="Quits" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Solve time chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">Solve Time by Game (p50 / p90 seconds)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeChart} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="p50" name="p50 seconds" fill="#5dacdf" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="p90" name="p90 seconds" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Per-game health table */}
          <Card>
            <CardHeader><CardTitle className="text-base">Per-Game Health</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game</TableHead>
                    <TableHead className="text-right">N</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                    <TableHead className="text-right">Solve</TableHead>
                    <TableHead className="text-right">Skip</TableHead>
                    <TableHead className="text-right">Optimal</TableHead>
                    <TableHead className="text-right">p50</TableHead>
                    <TableHead className="text-right">p90</TableHead>
                    <TableHead className="text-right">postSolve</TableHead>
                    <TableHead>Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.games.map((g) => (
                    <TableRow key={g.gameId}>
                      <TableCell className="font-medium">{g.gameId}</TableCell>
                      <TableCell className="text-right">{g.attempts}</TableCell>
                      <TableCell className="text-right">{g.sessions}</TableCell>
                      <TableCell className="text-right">{pct(g.solved, g.solved + g.abandoned + g.failed)}</TableCell>
                      <TableCell className="text-right">{pct(g.abandoned + g.failed + g.skipped, g.attempts)}</TableCell>
                      <TableCell className="text-right">{pct(g.optimalSolves, g.solved)}</TableCell>
                      <TableCell className="text-right">{g.p50Seconds ?? '—'}</TableCell>
                      <TableCell className="text-right">{g.p90Seconds ?? '—'}</TableCell>
                      <TableCell className="text-right">{g.postSolveMoves}</TableCell>
                      <TableCell><HealthBadge game={g} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Least played */}
          <Card>
            <CardHeader><CardTitle className="text-base">Candidates for Review</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.games
                  .filter((g) => g.attempts <= 5 || (g.abandoned + g.failed + g.skipped) / g.attempts > 0.3)
                  .map((g) => {
                    const quitRate = g.attempts ? (g.abandoned + g.failed + g.skipped) / g.attempts : 0;
                    const reasons: string[] = [];
                    if (g.attempts <= 5) reasons.push(`only ${g.attempts} plays`);
                    if (quitRate > 0.3) reasons.push(`${(quitRate * 100).toFixed(0)}% quit rate`);
                    if (g.postSolveMoves > 50) reasons.push(`${g.postSolveMoves} post-solve moves`);
                    if (g.monotonicity !== null && g.monotonicity > -0.3) reasons.push('difficulty knob flat');
                    return (
                      <div key={g.gameId} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                        <span className="font-medium">{g.gameId}</span>
                        <span className="text-muted-foreground">{reasons.join(', ')}</span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Difficulty tab ─────────────────────────────── */}
        <TabsContent value="difficulty" className="space-y-4">
          {/* Quit rate bar chart */}
          <Card>
            <CardHeader><CardTitle className="text-base">Quit Rate by Game (≥3 attempts)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={quitChart} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="quitRate" name="Quit rate" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Difficulty scatter */}
          <Card>
            <CardHeader><CardTitle className="text-base">Difficulty vs Success Rate</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" name="Difficulty" unit="" />
                  <YAxis dataKey="y" name="Success rate" domain={[0, 1.1]} />
                  <Tooltip
                    formatter={(v: number, name: string) =>
                      name === 'y' ? `${(v * 100).toFixed(0)}%` : v
                    }
                    labelFormatter={(l) => `D=${l}`}
                  />
                  <Scatter data={diffScatter} dataKey="y">
                    {diffScatter.map((pt, i) => (
                      <Cell key={`${pt.game}-${i}`} fill={pt.fill} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">
                Each dot is a (difficulty, success rate) bucket. A downward slope means the difficulty knob works.
                A flat band means it doesn't.
              </p>
            </CardContent>
          </Card>

          {/* Monotonicity table */}
          <Card>
            <CardHeader><CardTitle className="text-base">Difficulty Knob Calibration</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game</TableHead>
                    <TableHead className="text-right">ρ (Spearman)</TableHead>
                    <TableHead>Buckets</TableHead>
                    <TableHead>Verdict</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.games.map((g) => (
                    <TableRow key={`mono-${g.gameId}`}>
                      <TableCell className="font-medium">{g.gameId}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {g.monotonicity !== null ? g.monotonicity.toFixed(2) : '—'}
                      </TableCell>
                      <TableCell>{g.difficultyBreakdown.length}</TableCell>
                      <TableCell>
                        {g.monotonicity === null
                          ? <Badge variant="outline">insufficient data</Badge>
                          : g.monotonicity < -0.5
                            ? <Badge variant="default">working ✓</Badge>
                            : g.monotonicity < -0.3
                              ? <Badge variant="secondary">weak</Badge>
                              : <Badge variant="destructive">flat ⚠️</Badge>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Players tab ───────────────────────────────── */}
        <TabsContent value="players" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Player Sessions</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead className="text-right">Puzzles</TableHead>
                    <TableHead className="text-right">Solved</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead className="text-right">Solve %</TableHead>
                    <TableHead>Games Played</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.players.slice(0, 50).map((p) => {
                    const solvePct = p.totalPuzzles ? `${(100 * p.solved / p.totalPuzzles).toFixed(0)}%` : '—';
                    return (
                      <TableRow key={p.sessionId}>
                        <TableCell className="font-mono text-xs">{p.sessionId.slice(0, 8)}…</TableCell>
                        <TableCell className="text-right">{p.totalPuzzles}</TableCell>
                        <TableCell className="text-right">{p.solved}</TableCell>
                        <TableCell className="text-right">{p.skipped}</TableCell>
                        <TableCell className="text-right">{solvePct}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.gamesPlayed.join(', ')}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {data.players.length > 50 && (
                <p className="text-xs text-muted-foreground p-4">
                  Showing 50 of {data.players.length} sessions
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Trend tab ─────────────────────────────────── */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Activity Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.trend} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="puzzlesStarted" name="Puzzles started" stroke="#5dacdf" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="puzzlesSolved" name="Solved" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="activeSessions" name="Active sessions" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Integrity tab ──────────────────────────────── */}
        <TabsContent value="integrity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Post-Solve Moves (moves logged after solve)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={integrityData} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="postSolve" name="Post-solve moves" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">
                These moves were logged after the puzzle was already solved. Should be ~0 after
                the lock-on-solve fix. High counts mean the frontend is still sending moves after
                the player solved the puzzle.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
