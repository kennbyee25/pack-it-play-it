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
    fireEvent.mouseDown(screen.getByLabelText('cell-0-0'), { button: 0 });
    expect(screen.getByLabelText('moves')).toHaveTextContent('1 moves');
  });

  it('solves when the known solution is replayed', () => {
    const onSolved = vi.fn();
    render(<GamePlayer game={nonogram} generated={gen()} canRevealSolution onSolved={onSolved} />);
    fireEvent.click(screen.getByRole('button', { name: /show solution/i }));
    expect(onSolved).toHaveBeenCalledTimes(1);
  });
});
