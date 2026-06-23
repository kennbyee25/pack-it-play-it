import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameStats } from './GameStats';

describe('GameStats', () => {
  it('renders efficiency percentage and placed/total counts', () => {
    render(<GameStats efficiency={42} piecesPlaced={3} totalPieces={7} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('/ 7')).toBeInTheDocument();
  });

  it('shows 0% on a fresh board', () => {
    render(<GameStats efficiency={0} piecesPlaced={0} totalPieces={5} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
