import { useEffect, useRef, useState } from 'react';
import type { PuzzleGame, Generated } from '@/games/types';
import type { SolveMetrics } from '@/games/adaptive';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { GraphBoard } from '@/games/_renderers/GraphBoard';
import { SetBoard } from '@/games/_renderers/SetBoard';
import { PathBoard } from '@/games/_renderers/PathBoard';
import { AssignmentBoard } from '@/games/_renderers/AssignmentBoard';
import { NonogramBoard } from '@/games/_renderers/NonogramBoard';

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
    case 'nonogram':
      return <NonogramBoard state={state} onMove={onMove} />;
    default:
      return <div>Unsupported game</div>;
  }
}

interface GamePlayerProps {
  game: PuzzleGame<any, any>;
  generated: Generated<any, any>;
  onSolved?: (metrics: SolveMetrics) => void;
  // Training affordance (also drives e2e): reveal/apply the known solution.
  canRevealSolution?: boolean;
}

// Generic shell: holds one game's state, applies moves, tracks moves + time, and
// reports solve metrics when the verifier passes. Used standalone and in EndlessMode.
export function GamePlayer({ game, generated, onSolved, canRevealSolution }: GamePlayerProps) {
  const [state, setState] = useState<any>(generated.puzzle);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef(Date.now());

  // New puzzle: reset board, moves, and the clock.
  useEffect(() => {
    setState(generated.puzzle);
    setMoves(0);
    setSeconds(0);
    startRef.current = Date.now();
  }, [generated]);

  const solved = game.isSolved(state);
  const progress = game.progress(state);

  // Tick the timer until solved.
  useEffect(() => {
    if (solved) return;
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - startRef.current) / 1000)), 250);
    return () => clearInterval(id);
  }, [solved, generated]);

  const applyMove = (m: any) => {
    setState((s: any) => game.applyMove(s, m));
    setMoves((n) => n + 1);
  };

  // Reset restores the board (and move count) but NOT the timer.
  const resetPuzzle = () => {
    setState(generated.puzzle);
    setMoves(0);
  };

  // Replays the known solution as real moves (so it counts as an optimal solve).
  const showSolution = () => {
    generated.solution.forEach((m: any) => applyMove(m));
  };

  const reportedRef = useRef(false);
  useEffect(() => {
    reportedRef.current = false;
  }, [generated]);
  useEffect(() => {
    if (solved && !reportedRef.current) {
      reportedRef.current = true;
      onSolved?.({
        moves,
        optimalMoves: generated.solution.length,
        seconds: Math.floor((Date.now() - startRef.current) / 1000),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex flex-col items-center gap-1">
        <h2 className="font-display text-xl font-bold">{game.name}</h2>
        <p className="text-xs text-muted-foreground text-center">{game.description}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground" aria-label="progress">{progress}%</span>
        <span className="text-sm text-muted-foreground" aria-label="moves">{moves} moves</span>
        <span className="text-sm text-muted-foreground tabular-nums" aria-label="timer">{seconds}s</span>
        {solved && <span className="text-piece-teal font-medium" aria-label="solved">Solved! 🎉</span>}
      </div>
      <Board game={game} state={state} onMove={applyMove} />
      <div className="flex items-center gap-2">
        {!solved && (
          <Button variant="outline" size="sm" onClick={resetPuzzle}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        )}
        {canRevealSolution && !solved && (
          <Button variant="ghost" size="sm" onClick={showSolution}>
            Show solution
          </Button>
        )}
      </div>
    </div>
  );
}