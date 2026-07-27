// Prometheus metrics endpoint (/api/metrics).
// Aggregates in-memory counters for puzzle outcomes and behavioral signals.
// Resets on page reload — for durable dashboards, scrape the OTel collector instead.

const counters: Record<string, number> = {};

const inc = (key: string) => { counters[key] = (counters[key] ?? 0) + 1; };

/** Call from telemetry sinks to increment counters when a trace event arrives. */
export const observe = {
  puzzleStarted:     (gameId: string) => { inc(`puzzle_started_total{game="${gameId}"}`); },
  puzzleEnded:       (gameId: string, outcome: string) => { inc(`puzzle_ended_total{game="${gameId}",outcome="${outcome}"}`); },
  behavioralEvent:   (type: string)   => { inc(`behavioral_event_total{type="${type}"}`); },
  gameLoaded:        ()               => { inc(`game_load_total`); },
};

export const GET = (): Response => {
  const lines: string[] = [
    '# HELP puzzle_started_total Puzzles served, by game',
    '# TYPE puzzle_started_total counter',
    '# HELP puzzle_ended_total Puzzles finished, by game and outcome',
    '# TYPE puzzle_ended_total counter',
    '# HELP behavioral_event_total Behavioral signals emitted, by type',
    '# TYPE behavioral_event_total counter',
    '# HELP game_load_total Times a game has been loaded',
    '# TYPE game_load_total counter',
  ];
  for (const [key, val] of Object.entries(counters).sort(([a], [b]) => a < b ? -1 : 1)) {
    lines.push(`${key} ${val}`);
  }
  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; version=0.0.4' },
  });
};
