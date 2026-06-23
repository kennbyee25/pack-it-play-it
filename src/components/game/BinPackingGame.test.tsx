import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BinPackingGame } from './BinPackingGame';

describe('BinPackingGame (integration)', () => {
  it('mounts a fresh, unsolved puzzle', () => {
    render(<BinPackingGame />);
    expect(screen.getByRole('heading', { name: /polyomino packing/i })).toBeInTheDocument();
    // Fresh board: 0% efficiency, pieces waiting in the tray.
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText(/pieces \(\d+ remaining\)/i)).toBeInTheDocument();
  });

  it('regenerates the puzzle when a difficulty is chosen', async () => {
    const user = userEvent.setup();
    render(<BinPackingGame />);
    await user.click(screen.getByRole('button', { name: /^hard$/i }));
    // Bin label reflects the hard config (6 x 5).
    expect(screen.getByText(/bin \(6 × 5\)/i)).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('Reset keeps the board empty and all pieces in the tray', async () => {
    const user = userEvent.setup();
    render(<BinPackingGame />);
    const trayLabel = screen.getByText(/pieces \(\d+ remaining\)/i).textContent;
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText(trayLabel!)).toBeInTheDocument();
  });

  it('offers easy, medium, and hard difficulties', () => {
    render(<BinPackingGame />);
    const controls = screen.getByRole('heading', { name: /polyomino packing/i })
      .parentElement!.parentElement!;
    for (const diff of ['easy', 'medium', 'hard']) {
      expect(
        within(controls).getByRole('button', { name: new RegExp(`^${diff}$`, 'i') }),
      ).toBeInTheDocument();
    }
  });
});
