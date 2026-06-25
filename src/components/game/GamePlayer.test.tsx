import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GamePlayer } from './GamePlayer';
import { setCover } from '@/games/setCover';
import { makeRng } from '@/games/rng';

const gen = () => setCover.generate(1000, makeRng(4));

describe('GamePlayer', () => {
  it('Reset restores the board and move count', () => {
    render(<GamePlayer game={setCover} generated={gen()} />);
    expect(screen.getByLabelText('moves')).toHaveTextContent('0 moves');

    fireEvent.click(screen.getByRole('button', { name: 'subset-0' }));
    expect(screen.getByLabelText('moves')).toHaveTextContent('1 moves');
    expect(screen.getByLabelText('progress')).not.toHaveTextContent(/^0%$/);

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByLabelText('moves')).toHaveTextContent('0 moves');
    expect(screen.getByLabelText('progress')).toHaveTextContent(/^0%$/);
  });

  it('reports optimal-move metrics when solved via the solution', () => {
    const g = gen();
    const onSolved = vi.fn();
    render(<GamePlayer game={setCover} generated={g} canRevealSolution onSolved={onSolved} />);
    fireEvent.click(screen.getByRole('button', { name: /show solution/i }));
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(onSolved).toHaveBeenCalledWith(
      expect.objectContaining({ moves: g.solution.length, optimalMoves: g.solution.length }),
    );
  });
});
