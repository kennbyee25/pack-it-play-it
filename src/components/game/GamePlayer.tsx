import { useEffect, useState } from 'react';
import type { PuzzleGame, Generated } from '@/games/types';
import { applySolution } from '@/games/types';
import { Button } from '@/components/ui/button';
import { GraphBoard } from '@/games/_renderers/GraphBoard';
import { SetBoard } from '@/games/_renderers/SetBoard';
import { PathBoard } from '@/games/_renderers/PathBoard';
import { AssignmentBoard } from '@/games/_renderers/AssignmentBoard';

/* eslint-disable @typescript-eslint/no-explicit-any */
function Board({ game, state, onMove }: { game: PuzzleGame<any, any>; state: any; onMove: (m: any) => void }) {
  switch (game.archetype) {
    case 'graph-select':
      return <GraphBoard state={state} onMove={onMove} />;
    case 'set-cover':
      return <SetBoard state={state} onMove={onMove} />;
    case 'graph-path':
      return <PathBoard state={state} onMove={onMove} />;
    case 'logic-assignment':
      return <AssignmentBoard state={state} onMove={onMove} />;
    default:
      return <div>Unsupported game</div>;
  }
}

interface GamePlayerProps {
  game: PuzzleGame<any, any>;
  generated: Generated<any, any>;
  onSolved?: () => void;
  // Training affordance (also drives e2e): reveal/apply the known solution.
  canRevealSolution?: boolean;
}

// Generic shell: holds one game's state, applies moves, reports progress, and
// fires onSolved when the verifier passes. Used standalone and inside EndlessMode.
export function GamePlayer({ game, generated, onSolved, canRevealSolution }: GamePlayerProps) {
  const [state, setState] = useState<any>(generated.puzzle);
  const [moves, setMoves] = useState(0);

  // Reset when a new puzzle is handed in.
  useEffect(() => {
    setState(generated.puzzle);
    setMoves(0);
  }, [generated]);

  const applyMove = (m: any) => {
    setState((s: any) => game.applyMove(s, m));
    setMoves((n) => n + 1);
  };

  const solved = game.isSolved(state);
  const progress = game.progress(state);

  useEffect(() => {
    if (solved) onSolved?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-xl font-bold">{game.name}</h2>
        <span className="text-sm text-muted-foreground" aria-label="progress">{progress}%</span>
        <span className="text-sm text-muted-foreground" aria-label="moves">{moves} moves</span>
        {solved && <span className="text-piece-teal font-medium" aria-label="solved">Solved! 🎉</span>}
      </div>
      <Board game={game} state={state} onMove={applyMove} />
      {canRevealSolution && !solved && (
        <Button variant="ghost" size="sm" onClick={() => setState(applySolution(game, generated))}>
          Show solution
        </Button>
      )}
    </div>
  );
}
