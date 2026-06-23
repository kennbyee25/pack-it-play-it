import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EndlessMode } from './EndlessMode';

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

  it('renders a game from the registry (has a progress readout)', () => {
    render(<EndlessMode seed={1} />);
    expect(screen.getByLabelText('progress')).toBeInTheDocument();
  });
});
