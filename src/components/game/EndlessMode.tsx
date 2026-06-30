import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getGame } from '@/games/registry';
import { buildSchedule } from '@/games/scheduler';
import { makeRng } from '@/games/rng';
import { DIFFICULTY, enabledGameIds } from '@/games/settings';
import { generateUnique } from '@/games/uniqueness';
import { useGameSettings } from '@/hooks/useGameSettings';
import { useSessionOptions } from '@/hooks/useSessionOptions';
import { GamePlayer } from './GamePlayer';
import { SessionSettings } from './SessionSettings';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { computeOutcome, type SolveMetrics } from '@/adaptive/outcome';
import {
  PlayerRating,
  DEFAULT_RATING,
  updatePlayer,
} from '@/games/skill/rating';
import { selectDifficulty } from '@/games/skill/selectDifficulty';
import { loadRating, saveRating } from '@/games/skill/storage';

// ── Hysteresis ───────────────────────────────────────────────────────────────
// Only adjust difficulty when the player is consistently outside the flow band,
// preventing fluke solves/skips from causing whiplash.
const HYSTERESIS = {
  /** Consecutive out-of-band outcomes before difficulty adjustment */
  threshold: 3,
  /** Outcomes in [low, high] are "in band" — no adjustment */
  inBandLow: 0.4,
  inBandHigh: 0.95,
} as const;

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

  const { settings, setEnabled, setDifficulty, reset } = useGameSettings();
  const { options: sessionOptions, setOption: setSessionOption } =
    useSessionOptions();
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
  const [score, setScore] = useState(0);
  const currentSolvedRef = useRef(false);

  // Pass current game context to callbacks without adding render-cycle deps.
  const currentCtxRef = useRef({ gameId: '', difficulty: DIFFICULTY.default });

  // Per-game rating map: gameId -> PlayerRating
  const ratingsRef = useRef<Record<string, PlayerRating>>({});

  // Hysteresis: consecutive out-of-band outcomes per game (used to gate
  // difficulty changes — only adapt when consistently outside the flow band).
  const hysteresisRef = useRef<Record<string, number>>({});

  // Changing the enabled set restarts the rotation (and re-randomizes); a
  // difficulty change does NOT land here.
  useEffect(() => {
    setIndex(0);
    currentSolvedRef.current = false;
    if (!deterministic) setRand(randSeed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledKey]);

  // Load ratings for enabled games on mount and when enabled set changes
  useEffect(() => {
    const newRatings: Record<string, PlayerRating> = {};
    for (const id of enabledIds) {
      newRatings[id] = loadRating(id);
    }
    ratingsRef.current = newRatings;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledIds, enabledKey]);

  // When a game is newly enabled, ensure we have a rating for it
  useEffect(() => {
    for (const id of enabledIds) {
      if (!(id in ratingsRef.current)) {
        ratingsRef.current[id] = loadRating(id);
      }
    }
  }, [enabledIds]);

  const item = schedule[index % schedule.length];
  const game = getGame(item.gameId);

  // Skill-based difficulty selection (Stage 1 Glicko-lite).
  const rating = ratingsRef.current[item.gameId] ?? DEFAULT_RATING;
  const prevDifficulty = currentCtxRef.current.difficulty;
  const difficulty = selectDifficulty(rating, {
    pTarget: 0.8,
    prevDifficulty,
    maxJump: 100,
  });
  currentCtxRef.current = { gameId: item.gameId, difficulty };

  const genSeed = (deterministic ? (fixedSeed as number) : rand) + index * 7919;

  // Regenerate on advance, difficulty change, re-randomize, or uniqueSolution toggle.
  const generated = useMemo(
    () =>
      generateUnique(
        game,
        difficulty,
        makeRng(genSeed),
        { unique: sessionOptions.uniqueSolution },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, difficulty, genSeed, sessionOptions.uniqueSolution],
  );

  // Adaptive difficulty change is computed on solve but applied on advance, so it
  // never disrupts the just-solved puzzle.
  const pendingAdapt = useRef<{ gameId: string; difficulty: number } | null>(null);

  const advance = useCallback(() => {
    const { gameId, difficulty: curDiff } = currentCtxRef.current;
    if (!currentSolvedRef.current && gameId) {
      setScore((s) => s - 50);
      // Record a skip (outcome=0) — decreases skill, persists.
      const currentRating = ratingsRef.current[gameId] ?? DEFAULT_RATING;
      const newRating = updatePlayer(currentRating, curDiff, 0);
      ratingsRef.current[gameId] = newRating;
      saveRating(gameId, newRating);
    }
    currentSolvedRef.current = false;
    const p = pendingAdapt.current;
    if (p) {
      setDifficulty(p.gameId, p.difficulty);
      pendingAdapt.current = null;
    }
    setIndex((i) => i + 1);
    if (!deterministic) setRand(randSeed());
  }, [deterministic, setDifficulty]);

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
      currentSolvedRef.current = true;
      setSolvedCount((c) => c + 1);
      setScore((s) => s + 50);

      const gameId = item.gameId;
      const currentRating = ratingsRef.current[gameId] ?? DEFAULT_RATING;
      const outcome = computeOutcome(true, metrics, difficulty);
      const newRating = updatePlayer(currentRating, difficulty, outcome);
      ratingsRef.current[gameId] = newRating;
      saveRating(gameId, newRating);

      // Hysteresis: only adapt when consistently outside the flow band.
      // Rating updates every puzzle (learning signal), but difficulty only
      // changes after N consecutive out-of-band outcomes.
      const inBand =
        outcome >= HYSTERESIS.inBandLow && outcome <= HYSTERESIS.inBandHigh;
      if (inBand) {
        hysteresisRef.current[gameId] = 0;
      } else {
        hysteresisRef.current[gameId] =
          (hysteresisRef.current[gameId] ?? 0) + 1;
      }

      if (hysteresisRef.current[gameId] >= HYSTERESIS.threshold) {
        // Select next difficulty based on updated rating
        const nextDiff = selectDifficulty(newRating, {
          pTarget: 0.8,
          prevDifficulty: difficulty,
          maxJump: 100,
        });
        if (nextDiff !== difficulty) {
          pendingAdapt.current = { gameId, difficulty: nextDiff };
        }
        hysteresisRef.current[gameId] = 0;
      }

      if (autoNext) {
        clearTimeout(timer.current);
        timer.current = setTimeout(advance, 900);
      }
    },
    [autoNext, advance, difficulty, item.gameId],
  );

  // Spacebar advances, unless focus is on an interactive control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        t.closest(
          'input, textarea, [role="slider"], [role="checkbox"], [role="switch"], button',
        )
      ) {
        return;
      }
      e.preventDefault();
      advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance]);

  const canRevealSolution =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('solve');

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Puzzle #{index + 1}</span>
        <span aria-label="solved-count">Solved: {solvedCount}</span>
        <span aria-label="score" className={score < 0 ? 'text-destructive' : score > 0 ? 'text-piece-teal' : ''}>Score: {score}</span>
        <span aria-label="skill" className="text-muted-foreground/70 text-xs">
          <abbr title="Per-game skill estimate (Glicko-lite)">Skill</abbr>: {Math.round(rating.skill)}
        </span>
      </div>
      <SessionSettings
        settings={settings}
        onToggle={setEnabled}
        onDifficulty={setDifficulty}
        onReset={reset}
        sessionOptions={sessionOptions}
        onSessionOption={setSessionOption}
      />
      <GamePlayer
        key={index}
        game={game}
        generated={generated}
        canRevealSolution={canRevealSolution}
        onSolved={handleSolved}
      />
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
