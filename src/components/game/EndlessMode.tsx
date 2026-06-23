import { useMemo, useState } from 'react';
import { GAME_IDS, getGame } from '@/games/registry';
import { buildSchedule } from '@/games/scheduler';
import { makeRng } from '@/games/rng';
import { GamePlayer } from './GamePlayer';
import { Button } from '@/components/ui/button';

// The "one box": an interleaved stream of NP-complete puzzles. Solving one (or
// skipping) advances to the next game in the schedule — no game-over screen.
export function EndlessMode({ seed = Date.now() >>> 0 }: { seed?: number }) {
  const schedule = useMemo(
    () =>
      buildSchedule(
        { gameIds: GAME_IDS, dosePerGame: 8, mode: 'interleaved', maxRunLength: 1 },
        makeRng(seed),
      ),
    [seed],
  );

  const [index, setIndex] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const item = schedule[index % schedule.length];
  const game = getGame(item.gameId);

  // Regenerate the puzzle whenever we advance.
  const generated = useMemo(
    () => game.generate(item.difficulty, makeRng(seed + index * 7919)),
    [game, item.difficulty, index, seed],
  );

  const advance = () => setIndex((i) => i + 1);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Puzzle #{index + 1}</span>
        <span aria-label="solved-count">Solved: {solvedCount}</span>
      </div>
      <GamePlayer
        key={index}
        game={game}
        generated={generated}
        onSolved={() => setSolvedCount((c) => c + 1)}
      />
      <Button onClick={advance} variant="outline" size="sm">
        Next puzzle →
      </Button>
    </div>
  );
}
