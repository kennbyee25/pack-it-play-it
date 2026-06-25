import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EndlessMode } from './EndlessMode';
import { GAMES } from '@/games/registry';
import { defaultSettings, serialize, setEnabled } from '@/games/settings';

beforeEach(() => window.localStorage.clear());

describe('EndlessMode (integration)', () => {
  it('mounts the box on the first puzzle', () => {
    render(<EndlessMode seed={1} />);
    expect(screen.getByText('Puzzle #1')).toBeInTheDocument();
    expect(screen.getByLabelText('solved-count')).toHaveTextContent('Solved: 0');
  });

  it('advances to the next puzzle with no game-over screen', async () => {
    const user = userEvent.setup();
    render(<EndlessMode seed={1} />);
    await user.click(screen.getByRole('button', { name: /next puzzle/i }));
    expect(screen.getByText('Puzzle #2')).toBeInTheDocument();
  });

  it('advances on spacebar (when focus is not on a control)', () => {
    render(<EndlessMode seed={1} />);
    expect(screen.getByText('Puzzle #1')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { code: 'Space', key: ' ' });
    expect(screen.getByText('Puzzle #2')).toBeInTheDocument();
  });

  it('renders a game from the registry (has a progress readout)', () => {
    render(<EndlessMode seed={1} />);
    expect(screen.getByLabelText('progress')).toBeInTheDocument();
  });

  it('only streams enabled games', async () => {
    // Persist settings with just the first game enabled.
    let s = defaultSettings(GAMES);
    for (const g of GAMES.slice(1)) s = setEnabled(s, g.id, false);
    window.localStorage.setItem('pip.settings', serialize(s));

    const user = userEvent.setup();
    render(<EndlessMode seed={1} />);
    const only = GAMES[0].name;
    for (let i = 0; i < 4; i++) {
      expect(screen.getByRole('heading', { name: only })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /next puzzle/i }));
    }
  });

  it('changing the rotation re-rolls back to puzzle #1', async () => {
    const user = userEvent.setup();
    render(<EndlessMode seed={1} />);
    await user.click(screen.getByRole('button', { name: /next puzzle/i }));
    expect(screen.getByText('Puzzle #2')).toBeInTheDocument();

    // Open advanced options and disable a game.
    await user.click(screen.getByRole('button', { name: /advanced options/i }));
    await user.click(screen.getByRole('checkbox', { name: new RegExp(`enable ${GAMES[1].name}`, 'i') }));

    expect(screen.getByText('Puzzle #1')).toBeInTheDocument();
  });
});
