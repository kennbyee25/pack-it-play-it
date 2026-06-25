import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { PuzzleErrorBoundary } from './PuzzleErrorBoundary';

afterEach(cleanup);

function Boom(): JSX.Element {
  throw new Error('kaboom: state.clauses is undefined');
}

describe('PuzzleErrorBoundary', () => {
  it('renders children normally when nothing throws', () => {
    render(
      <PuzzleErrorBoundary>
        <div>healthy puzzle</div>
      </PuzzleErrorBoundary>,
    );
    expect(screen.getByText('healthy puzzle')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('catches a render crash, shows a recoverable fallback, and logs context', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <PuzzleErrorBoundary context={{ gameId: 'nonogram', index: 3 }}>
        <Boom />
      </PuzzleErrorBoundary>,
    );

    // Fallback is shown instead of a blank screen.
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByLabelText('puzzle-error')).toBeTruthy();

    // The crash was logged with diagnostic context.
    const logged = err.mock.calls.find(([msg]) => msg === '[pip] puzzle render crashed');
    expect(logged).toBeTruthy();
    expect(logged![1]).toMatchObject({ gameId: 'nonogram', index: 3 });
    expect(String(logged![1].message)).toContain('clauses');
    err.mockRestore();
  });

  it('invokes onSkip from the fallback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onSkip = vi.fn();
    render(
      <PuzzleErrorBoundary onSkip={onSkip}>
        <Boom />
      </PuzzleErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /skip to next puzzle/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
