import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getGame } from '@/games/registry';
import { buildSchedule } from '@/games/scheduler';
import { makeRng } from '@/games/rng';
import { DIFFICULTY, enabledGameIds } from '@/games/settings';
import { useGameSettings } from '@/hooks/useGameSettings';
import { GamePlayer } from './GamePlayer';
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

  const { settings, setEnabled, setDifficulty, reset } = useGameSettings();
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

  const item = schedule[index % schedule.length];
  const game = getGame(item.gameId);
  const difficulty = settings[item.gameId]?.difficulty ?? DIFFICULTY.default;
  const genSeed = (deterministic ? (fixedSeed as number) : rand) + index * 7919;

  // Regenerate on advance, on difficulty change (same rotation position), or on
  // re-randomize — but never just because options re-rendered.
  const generated = useMemo(() => game.generate(difficulty, makeRng(genSeed)), [game, difficulty, genSeed]);

  const advance = useCallback(() => {
    setIndex((i) => i + 1);
    if (!deterministic) setRand(randSeed());
  }, [deterministic]);

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

  const handleSolved = useCallback(() => {
    setSolvedCount((c) => c + 1);
    if (autoNext) {
      clearTimeout(timer.current);
      timer.current = setTimeout(advance, 900);
    }
  }, [autoNext, advance]);

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
