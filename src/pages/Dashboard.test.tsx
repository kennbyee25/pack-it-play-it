import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';
import { type TelemetryEvent, type PuzzleStarted, type PuzzleEnded } from '@/lib/dashboard';

// ── Fixtures ─────────────────────────────────────────────────────────────────

let nextTs = 1_700_000_000_000;
function ts(): number { return nextTs++; }
const SID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function started(overrides: Partial<PuzzleStarted> = {}): PuzzleStarted {
  return {
    type: 'puzzle_started',
    sessionId: SID,
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
    sessionId: SID,
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

function makeEvents(n = 3): TelemetryEvent[] {
  const events: TelemetryEvent[] = [];
  for (let i = 0; i < n; i++) {
    const s = started({ puzzleId: `p${i}`, gameId: 'binPacking' });
    const e = ended({ puzzleId: s.puzzleId, sessionId: s.sessionId });
    events.push(s, e);
  }
  return events;
}

// ── Mock fetch ───────────────────────────────────────────────────────────────

function mockFetch(events: TelemetryEvent[]) {
  const body = events.map((e) => JSON.stringify(e)).join('\n');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(body),
  }));
}

function mockFetchError() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
}

describe('Dashboard', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('renders loading state, then summary cards', async () => {
    mockFetch(makeEvents());

    render(<Dashboard />);

    // Loading state
    expect(screen.getByText(/loading telemetry/i)).toBeInTheDocument();

    // Wait for data
    await waitFor(() => {
      expect(screen.getByText('Game Analytics')).toBeInTheDocument();
    });

    // Summary cards
    expect(screen.getByText('Puzzles Attempted')).toBeInTheDocument();
    expect(screen.getByText('Solve Rate')).toBeInTheDocument();
    expect(screen.getByText('Optimal Solves')).toBeInTheDocument();
    expect(screen.getByText('Unique Sessions')).toBeInTheDocument();
  });

  it('renders all 5 tabs', async () => {
    mockFetch(makeEvents());

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Game Analytics')).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: 'Games' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Difficulty' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Players' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Trend' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Integrity' })).toBeInTheDocument();
  });

  it('shows game health table on Games tab', async () => {
    mockFetch(makeEvents());

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Game Analytics')).toBeInTheDocument();
    });

    // Games tab is default, should show per-game table
    expect(screen.getByText('Per-Game Health')).toBeInTheDocument();
    expect(screen.getAllByText('binPacking').length).toBeGreaterThanOrEqual(1);
  });

  it('shows error state with retry button on fetch failure', async () => {
    mockFetchError();

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/could not load dashboard/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('switches to Players tab and shows session data', async () => {
    mockFetch(makeEvents());

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Game Analytics')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Players' }));

    expect(screen.getByText('Player Sessions')).toBeInTheDocument();
  });

  it('switches to Trend tab and shows activity chart', async () => {
    mockFetch(makeEvents());

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Game Analytics')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Trend' }));

    expect(screen.getByText('Activity Over Time')).toBeInTheDocument();
  });

  it('shows events and sessions count in header', async () => {
    const events = makeEvents(2);
    mockFetch(events);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Game Analytics')).toBeInTheDocument();
    });

    expect(screen.getByText(`${events.length} events`)).toBeInTheDocument();
    expect(screen.getByText(/1 sessions/)).toBeInTheDocument();
  });

  it('shows Candidates for Review on Games tab', async () => {
    // Create a game with high quit rate to trigger the review candidate
    const s = started({ puzzleId: 'high-quit', gameId: 'hardGame' });
    const e = ended({ puzzleId: s.puzzleId, sessionId: s.sessionId, outcome: 'abandoned' });
    mockFetch([s, e]);

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Game Analytics')).toBeInTheDocument();
    });

    expect(screen.getByText('Candidates for Review')).toBeInTheDocument();
  });
});
