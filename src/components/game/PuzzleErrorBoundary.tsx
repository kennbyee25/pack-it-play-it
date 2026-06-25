import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  // Diagnostic context logged when a render crashes (game id, rotation index…).
  context?: Record<string, unknown>;
  // Recovery path: advance the rotation past the broken puzzle.
  onSkip?: () => void;
}
interface State {
  error: Error | null;
}

// A single malformed puzzle render must never blank the whole box. This catches
// the render throw, logs it with context for diagnosis, and offers a Skip so the
// session continues. Re-key this boundary per puzzle so a new puzzle clears the
// error state.
export class PuzzleErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error('[pip] puzzle render crashed', {
      message: error.message,
      ...this.props.context,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          aria-label="puzzle-error"
          className="flex flex-col items-center gap-3 p-6 text-center"
        >
          <p className="text-sm text-muted-foreground">
            This puzzle couldn&apos;t be displayed.
          </p>
          {this.props.onSkip && (
            <Button variant="outline" size="sm" onClick={this.props.onSkip}>
              Skip to next puzzle
            </Button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
