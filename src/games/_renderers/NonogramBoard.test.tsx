import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GamePlayer } from '@/components/game/GamePlayer';
import { nonogram } from '@/games/nonogram';
import { makeRng } from '@/games/rng';

const gen = () => nonogram.generate(1000, makeRng(4));

describe('NonogramBoard (via GamePlayer)', () => {
  // Regression: nonogram used to declare archetype 'logic-assignment', so
  // GamePlayer routed it to AssignmentBoard, which reads state.clauses — absent
  // on a nonogram — and threw, blanking the screen in the endless rotation.
  it('renders a nonogram board without crashing', () => {
    render(<GamePlayer game={nonogram} generated={gen()} />);
    expect(screen.getByText('Nonogram')).toBeInTheDocument();
    // The grid cells are present (not the AssignmentBoard's variable toggles).
    expect(screen.getByLabelText('cell-0-0')).toBeInTheDocument();
  });

  it('left-click fills a cell and counts a move', () => {
    render(<GamePlayer game={nonogram} generated={gen()} />);
    expect(screen.getByLabelText('moves')).toHaveTextContent('0 moves');
    fireEvent.pointerDown(screen.getByLabelText('cell-0-0'), { button: 0 });
    expect(screen.getByLabelText('moves')).toHaveTextContent('1 moves');
    expect(screen.getByLabelText('progress')).not.toHaveTextContent(/^0%$/);
  });

  it('clicking a filled cell again clears it (deselect)', () => {
    render(<GamePlayer game={nonogram} generated={gen()} />);
    const cell = screen.getByLabelText('cell-0-0');
    fireEvent.pointerDown(cell, { button: 0 }); // fill
    expect(screen.getByLabelText('progress')).not.toHaveTextContent(/^0%$/);
    fireEvent.pointerDown(cell, { button: 0 }); // clear
    expect(screen.getByLabelText('progress')).toHaveTextContent(/^0%$/);
  });

  it('solves when the known solution is replayed', () => {
    const onSolved = vi.fn();
    render(<GamePlayer game={nonogram} generated={gen()} canRevealSolution onSolved={onSolved} />);
    fireEvent.click(screen.getByRole('button', { name: /show solution/i }));
    expect(onSolved).toHaveBeenCalledTimes(1);
  });
});
