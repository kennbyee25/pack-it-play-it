import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getGame } from '@/games/registry';
import { buildSchedule } from '@/games/scheduler';
import { makeRng } from '@/games/rng';
import { DIFFICULTY, enabledGameIds, clampDifficulty } from '@/games/settings';
import { adaptDifficulty } from '@/games/adaptive';
import { generateUnique } from '@/games/uniqueness';
import { type SolveMetrics } from '@/games/adaptive';
import { scoreOutcome } from '@/games/skill/scorer';
import { selectChallenge } from '@/games/skill/challenge';
import { tracer } from '@/telemetry/tracer';
import { BayesianEngagementTuner } from '@/games/engagementTuner';
import { useGameSettings } from '@/hooks/useGameSettings';
import { useRatings } from '@/hooks/useRatings';
import { useSessionOptions } from '@/hooks/useSessionOptions';
import { GamePlayer } from './GamePlayer';
import { PuzzleErrorBoundary } from './PuzzleErrorBoundary';
import { SessionSettings } from './SessionSettings';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

// The "one box": an interleaved stream of NP-complete puzzles. Solving one (or
// skipping) advances to the next game in the rotation — no game-over screen.
function readSeedParam(): number | undefined {
  if (typeof window === 'undefined') return undefined;
  const q = new URLSearchParams(window.location.search).get('seed');
  if (q === null) return undefined;
  const n = Number(q);
  return Number.isFinite(n) ? n >>> 0 : undefined;
}

const randSeed = () => (Math.random() * 0xffffffff) >>> 0;

export function EndlessMode({ seed: seedProp }: { seed?: number } = {}) {
  // A fixed seed (prop or ?seed=) makes the whole stream deterministic — used by
  // e2e. Otherwise every puzzle is freshly, randomly generated.
  const [fixedSeed] = useState(() => seedProp ?? readSeedParam());
  const deterministic = fixedSeed !== undefined;

  const { settings, setEnabled, setDifficulty, reset, selectAll, deselectAll } = useGameSettings();
  const enabledIds = enabledGameIds(settings);
  const enabledKey = enabledIds.join(',');

  // The rotation (which games, in what order) depends ONLY on the enabled set —
  // changing a difficulty must not reshuffle or reset it.
  const [orderSeed] = useState(() => fixedSeed ?? randSeed());
  const schedule = useMemo(
    () =>
      buildSchedule(
        { gameIds: enabledIds, dosePerGame: 8, mode: 'interleaved', maxRunLength: 1 },
        makeRng(orderSeed),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabledKey, orderSeed],
  );

  const [index, setIndex] = useState(0);
  const [rand, setRand] = useState(() => (deterministic ? 0 : randSeed()));
  const [solvedCount, setSolvedCount] = useState(0);

  // Changing the enabled set restarts the rotation (and re-randomizes); a
  // difficulty change does NOT land here.
  useEffect(() => {
    setIndex(0);
    if (!deterministic) setRand(randSeed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledKey]);

  const { options: sessionOptions, setOption: onSessionOption } = useSessionOptions();
  // Ref for the unique-solution toggle so the generated useMemo can read the
  // latest value without being a dependency (which would regenerate mid-puzzle).
  const uniqueSolutionRef = useRef(sessionOptions.uniqueSolution);
  useEffect(() => { uniqueSolutionRef.current = sessionOptions.uniqueSolution; }, [sessionOptions.uniqueSolution]);

  const item = schedule[index % schedule.length];
  const game = getGame(item.gameId);
  const difficulty = settings[item.gameId]?.difficulty ?? DIFFICULTY.default;
  const genSeed = (deterministic ? (fixedSeed as number) : rand) + index * 7919;

  // Regenerate on advance, on difficulty change (same rotation position), or on
  // re-randomize — but never just because options re-rendered. When the
  // unique-solution toggle is on, use generateUnique which retries until the
  // puzzle has exactly one solution, falling back to a plain generate.
  const generated = useMemo(() => {
    const rng = makeRng(genSeed);
    if (uniqueSolutionRef.current && typeof game.countSolutions === 'function') {
      return generateUnique(game, difficulty, rng, { unique: true }) ?? game.generate(difficulty, makeRng(genSeed ^ 0x5eed));
    }
    return game.generate(difficulty, rng);
  }, [game, difficulty, genSeed]);

  // Per-game Glicko ratings drive the next difficulty via the Optimal Challenge
  // Point selector (replaces the old heuristic adaptDifficulty). A stable rng gives
  // the OCP band its jitter; deterministic/e2e mode omits it for stable runs.
  const { recordOutcome } = useRatings();
  const ocpRng = useRef(makeRng(((fixedSeed ?? orderSeed) ^ 0x5bd1e995) >>> 0));
  // Per-puzzle outcome flags (reset below). `failed` = the player hit Reset,
  // which counts as a fail even if they later solve it.
  const solvedRef = useRef(false);
  const failedRef = useRef(false);
  // Telemetry per-puzzle refs (the move count/time live in GamePlayer).
  const lastMoveRef = useRef({ count: 0, ms: 0 });
  const solveMetricsRef = useRef<SolveMetrics | null>(null);
  const optimalMovesRef = useRef(0);
  useEffect(() => {
    solvedRef.current = false;
    failedRef.current = false;
    lastMoveRef.current = { count: 0, ms: 0 };
    solveMetricsRef.current = null;
  }, [index]);

  // Engagement tuners per game (lazy-initialized)
  const engagementTunerRef = useRef<Map<string, BayesianEngagementTuner>>(new Map());
  
  // Get or create engagement tuner for a game
  const getEngagementTuner = useCallback((gameId: string): BayesianEngagementTuner => {
    if (!engagementTunerRef.current.has(gameId)) {
      // Try to load saved state from localStorage
      const saved = window.localStorage?.getItem(`pip.engagementTuner.${gameId}`);
      const tuner = new BayesianEngagementTuner(50); // Keep last 50 observations
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.observations)) {
            tuner['observations'] = parsed.observations;
          }
        } catch (e) {
          console.warn(`Failed to load engagement tuner state for ${gameId}:`, e);
        }
      }
      
      engagementTunerRef.current.set(gameId, tuner);
    }
    return engagementTunerRef.current.get(gameId)!;
  }, []);

  // Save engagement tuner state to localStorage
  const saveEngagementTunerState = useCallback((gameId: string) => {
    const tuner = engagementTunerRef.current.get(gameId);
    if (tuner) {
      try {
        window.localStorage?.setItem(
          `pip.engagementTuner.${gameId}`,
          JSON.stringify({ observations: tuner.getObservations() })
        );
      } catch (e) {
        console.warn(`Failed to save engagement tuner state for ${gameId}:`, e);
      }
    }
  }, []);

  // Calculate engagement score for a completed puzzle
  const calculateEngagementScore = useCallback((
    solved: boolean,
    moves: number,
    optimalMoves: number,
    seconds: number,
    moveList: { ts: number }[]
  ): number => {
    // Solve status (0.4 weight)
    const solvedPt = solved ? 1.0 : 0.0;
    
    // Move efficiency (0.3 weight) - target 0.7-0.9 range
    const eff = moves > 0 ? optimalMoves / moves : 0.0;
    let effPt: number;
    if (eff < 0.7) {
      effPt = eff / 0.7; // 0 to 1
    } else if (eff > 0.9) {
      effPt = Math.max(0.0, 1.0 - (eff - 0.9) / 0.3); // decline after 0.9
    } else {
      effPt = 1.0;
    }
    
    // Hesitation: lower is better, target <0.1 (0.2 weight)
    const hesitation = moveList.length >= 2 
      ? (() => {
          const interTimes: number[] = [];
          let prev = moveList[0].ts;
          for (let i = 1; i < moveList.length; i++) {
            interTimes.push((moveList[i].ts - prev) / 1000.0);
            prev = moveList[i].ts;
          }
          if (interTimes.length === 0) return 0.0;
          return interTimes.filter(t => t > 5.0).length / interTimes.length;
        })()
      : 0.0;
    const hesPt = Math.max(0.0, 1.0 - hesitation / 0.2); // zero at 0.2 or more
    
    // Skip: penalty (0.1 weight) - we only call this for ended puzzles
    const skipPt = 1.0; // Not skipped since we have an end event
    
    // Combine weights: solve 0.4, eff 0.3, hes 0.2, skip 0.1
    return 0.4 * solvedPt + 0.3 * effPt + 0.2 * hesPt + 0.1 * skipPt;
  }, []);

  // Emit a puzzle_started event whenever a new puzzle is shown.
  useEffect(() => {
    optimalMovesRef.current = generated.solution.length;
    tracer.puzzleStarted({
      index,
      gameId: item.gameId,
      difficulty,
      genSeed,
      optimalMoves: generated.solution.length,
      tuner: sessionOptions.tuningAlgorithm,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generated, sessionOptions.tuningAlgorithm]);

  const advance = useCallback(() => {
    // Close out the current puzzle's trace exactly once (tracer dedups).
    const cleanSolve = solvedRef.current && !failedRef.current;
    const outcome = cleanSolve ? 'solved' : failedRef.current ? 'failed' : 'abandoned';
    const m = solveMetricsRef.current;
    const moves = m?.moves ?? lastMoveRef.current.count;
    const seconds = m?.seconds ?? Math.floor(lastMoveRef.current.ms / 1000);
    const optimalMoves = optimalMovesRef.current;
    const score = scoreOutcome({ solved: cleanSolve, moves, optimalMoves, seconds });
    tracer.puzzleEnded({ outcome, moves, optimalMoves, seconds, score });

    // Calculate engagement score for this puzzle
    const engagementScore = calculateEngagementScore(
      cleanSolve,
      moves,
      optimalMoves,
      seconds,
      Array.from({ length: moves }, (_, i) => ({ 
        ts: Date.now() - (moves - i) * 1000 // Approximate - in real implementation, we'd track actual move times
      }))
    );

    // Update engagement tuner for this game
    const tuner = getEngagementTuner(item.gameId);
    tuner.addObservation({
      difficulty,
      engagement: engagementScore,
      timestamp: Date.now()
    });
    
    // Save tuner state periodically (every 5 observations to reduce storage writes)
    if (tuner.getObservations().length % 5 === 0) {
      saveEngagementTunerState(item.gameId);
    }

    // ---- Difficulty selection based on selected tuning algorithm ----
    let next: number;
    // Compute base suggestions for possible use in random/ensemble
    const naiveNext = (() => {
      const STEP = DIFFICULTY.step;
      if (score >= 0.8) {
        return clampDifficulty(difficulty + STEP);
      } else if (score <= 0.2) {
        return clampDifficulty(difficulty - STEP);
      }
      return difficulty;
    })();
    const adaptiveNext = adaptDifficulty(difficulty, { moves, optimalMoves, seconds });
    const smartNext = () => {
      const rating = recordOutcome(item.gameId, difficulty, score);
      return selectChallenge(rating, deterministic ? undefined : ocpRng.current);
    };
    const engagementNext = () => {
      // Suggest difficulty using Bayesian optimization with UCB
      // Explore within reasonable bounds around current difficulty
      const minDiff = Math.max(DIFFICULTY.min, difficulty - 200);
      const maxDiff = difficulty + 200;
      return tuner.suggestDifficulty(minDiff, maxDiff, DIFFICULTY.step, 1.0);
    };

    switch (sessionOptions.tuningAlgorithm) {
      case 'naive':
        next = naiveNext;
        break;
      case 'adaptive':
        next = adaptiveNext;
        break;
      case 'smart':
        next = smartNext();
        break;
      case 'engagement':
        next = engagementNext();
        break;
      case 'random': {
        // Pick one of the four base algorithms uniformly at random using the session RNG
        const r = ocpRng.current.next();
        if (r < 0.25) next = naiveNext;
        else if (r < 0.5) next = adaptiveNext;
        else if (r < 0.75) next = smartNext();
        else next = engagementNext();
        break;
      }
      case 'ensemble': {
        // Median of the four suggestions
        const arr = [naiveNext, adaptiveNext, smartNext(), engagementNext()].sort((a, b) => a - b);
        next = arr[1]; // second element (lower median of four)
        break;
      }
      default:
        // Fallback to smart
        next = smartNext();
    }
    
    setDifficulty(item.gameId, next);

    setIndex((i) => i + 1);
    if (!deterministic) setRand(randSeed());
  }, [deterministic, setDifficulty, recordOutcome, item.gameId, difficulty, sessionOptions.tuningAlgorithm, getEngagementTuner, saveEngagementTunerState, calculateEngagementScore]);

  // Auto-advance preference (off in deterministic/e2e mode so tests drive it).
  const [autoNext, setAutoNext] = useState(() => {
    if (deterministic || typeof window === 'undefined') return false;
    return window.localStorage.getItem('pip.autonext') !== 'off';
  });
  useEffect(() => {
    if (deterministic) return;
    try {
      window.localStorage.setItem('pip.autonext', autoNext ? 'on' : 'off');
    } catch {
      /* ignore */
    }
  }, [autoNext, deterministic]);

  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleSolved = useCallback(
    (metrics: SolveMetrics) => {
      setSolvedCount((c) => c + 1);
      solvedRef.current = true;
      solveMetricsRef.current = metrics;
      // Rating update + next difficulty happen in advance() (the single outcome
      // point), so a clean solve and a skip/fail flow through the same path.
      if (autoNext) {
        clearTimeout(timer.current);
        timer.current = setTimeout(advance, 900);
      }
    },
    [autoNext, advance],
  );

  // Spacebar advances, unless focus is on an interactive control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest('input, textarea, [role="slider"], [role="checkbox"], [role="switch"], button')) {
        return;
      }
      e.preventDefault();
      advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance]);

  const canRevealSolution =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('solve');

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Puzzle #{index + 1}</span>
        <span aria-label="solved-count">Solved: {solvedCount}</span>
      </div>
      <SessionSettings
        settings={settings}
        onToggle={setEnabled}
        onDifficulty={setDifficulty}
        onReset={reset}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        currentGameId={item.gameId}
        sessionOptions={sessionOptions}
        onSessionOption={onSessionOption}
      />
      <PuzzleErrorBoundary
        // Remount whenever the displayed game changes identity — not just on
        // advance. Deselecting the current game swaps another in at the same
        // index; reusing the player would run the new game against the old
        // game's state and crash the tree. Keying on gameId forces a clean mount
        // and also resets the boundary's error state for each new puzzle.
        key={`${item.gameId}:${index}`}
        context={{ gameId: item.gameId, index, difficulty, genSeed }}
        onSkip={advance}
      >
        <GamePlayer
          game={game}
          generated={generated}
          canRevealSolution={canRevealSolution}
          onSolved={handleSolved}
          onMove={(move, moveIndex, msSinceStart) => {
            lastMoveRef.current = { count: moveIndex + 1, ms: msSinceStart };
            tracer.move(move);
          }}
          onReset={() => {
            failedRef.current = true;
          }}
        />
      </PuzzleErrorBoundary>
      <div className="flex items-center gap-4">
        <Button onClick={advance} variant="outline" size="sm">
          Next puzzle <span className="ml-1 text-xs text-muted-foreground">(space)</span>
        </Button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={autoNext} onCheckedChange={setAutoNext} aria-label="auto-advance" />
          Auto-advance
        </label>
      </div>
    </div>
  );
}