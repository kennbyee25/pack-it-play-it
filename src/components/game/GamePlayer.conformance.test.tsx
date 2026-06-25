import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import { GAMES } from '@/games/registry';
import { makeRng } from '@/games/rng';
import { GamePlayer } from './GamePlayer';

afterEach(cleanup);

// Rendering contract. Logic conformance (registry.conformance.test.ts) proves
// each game's verifier/generator are sound, but the box also routes every game
// through GamePlayer's archetype -> renderer switch. If a game's archetype
// points at a renderer that reads a different state shape (the nonogram ->
// AssignmentBoard -> `state.clauses` bug), it throws mid-render and blanks the
// whole box. These tests mount every registered game across many seeds and
// sizes and fail loudly if any routing/state mismatch exists.
describe.each(GAMES.map((g) => [g.id, g] as const))('renders: %s', (_id, game) => {
  const seeds = [1, 2, 7, 42, 1337];
  const difficulties = [100, 800, 1600];

  it('mounts through GamePlayer for every seed/difficulty without throwing', () => {
    for (const d of difficulties) {
      for (const seed of seeds) {
        const generated = game.generate(d, makeRng(seed));
        expect(() => {
          const { unmount } = render(<GamePlayer game={game} generated={generated} />);
          unmount();
        }, `${game.id} @ difficulty=${d} seed=${seed}`).not.toThrow();
      }
    }
  });

  it('shows the game name, a progress readout, and is NOT the unsupported fallback', () => {
    const generated = game.generate(800, makeRng(3));
    const { container, getByLabelText } = render(
      <GamePlayer game={game} generated={generated} />,
    );
    expect(within(container).getByText(game.name)).toBeTruthy();
    expect(getByLabelText('progress')).toBeTruthy();
    // The archetype resolved to a real renderer, not the default branch.
    expect(container.textContent).not.toContain('Unsupported game');
  });
});
