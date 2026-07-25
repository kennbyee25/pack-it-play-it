import { useState, useEffect, useCallback } from 'react';
import type { SudokuState, SudokuMove } from '../sudoku';
import type { BoardProps } from './types';

const CELL = 40;

export function SudokuBoard({ state, onMove }: BoardProps<SudokuState, SudokuMove>) {
  const { size, grid, givens, boxRows, boxCols } = state;
  const [selected, setSelected] = useState<[number, number] | null>(null);

  const select = (r: number, c: number) => {
    setSelected((prev) => (prev?.[0] === r && prev?.[1] === c ? null : [r, c]));
  };

  const place = useCallback(
    (value: number) => {
      if (!selected || givens[selected[0]][selected[1]]) return;
      onMove({ row: selected[0], col: selected[1], value });
    },
    [selected, givens, onMove],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        place(Number(e.key));
        return;
      }
      if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
        place(0);
        return;
      }
      if (!selected) return;
      const [r, c] = selected;
      let nr = r, nc = c;
      if (e.key === 'ArrowUp') nr = Math.max(0, r - 1);
      else if (e.key === 'ArrowDown') nr = Math.min(size - 1, r + 1);
      else if (e.key === 'ArrowLeft') nc = Math.max(0, c - 1);
      else if (e.key === 'ArrowRight') nc = Math.min(size - 1, c + 1);
      else return;
      e.preventDefault();
      setSelected([nr, nc]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, size, place]);

  const numBoxRows = Math.ceil(size / boxRows);
  const numBoxCols = Math.ceil(size / boxCols);

  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-xs text-muted-foreground tabular-nums">
        {size}×{size}
      </span>
      <div
        className="inline-grid select-none"
        style={{
          gridTemplateColumns: `repeat(${size}, ${CELL}px)`,
          gridTemplateRows: `repeat(${size}, ${CELL}px)`,
        }}
      >
        {Array.from({ length: size }, (_, r) =>
          Array.from({ length: size }, (_, c) => {
            const isGiven = givens[r][c];
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const value = grid[r][c];

            const boxRow = Math.floor(r / boxRows);
            const boxCol = Math.floor(c / boxCols);
            const isBoxRight = (boxCol + 1) % numBoxCols === 0 || c === size - 1;
            const isBoxBottom = (boxRow + 1) % numBoxRows === 0 || r === size - 1;

            const majorRight = (c + 1) % boxCols === 0 && !isBoxRight;
            const majorBottom = (r + 1) % boxRows === 0 && !isBoxBottom;

            return (
              <div
                key={`${r}-${c}`}
                data-cell=""
                data-r={r}
                data-c={c}
                role="button"
                aria-label={`cell-${r}-${c}${value ? ` ${value}` : ''}`}
                aria-pressed={isSelected}
                onClick={() => !isGiven && select(r, c)}
                className={`
                  flex items-center justify-center
                  text-lg font-mono font-bold
                  transition-colors duration-100
                  ${isGiven
                    ? 'bg-muted text-foreground cursor-default'
                    : isSelected
                    ? 'bg-primary text-primary-foreground cursor-pointer ring-2 ring-ring ring-offset-1'
                    : 'bg-card cursor-pointer hover:bg-muted'
                  }
                `}
                style={{
                  boxSizing: 'border-box',
                  borderRight: `${isBoxRight ? 2 : majorRight ? 1 : 0.5}px solid hsl(var(--muted-foreground))`,
                  borderBottom: `${isBoxBottom ? 2 : majorBottom ? 1 : 0.5}px solid hsl(var(--muted-foreground))`,
                  borderTop: r % boxRows === 0 && boxRow > 0 ? '1px solid hsl(var(--border))' : 'none',
                  borderLeft: c % boxCols === 0 && boxCol > 0 ? '1px solid hsl(var(--border))' : 'none',
                }}
              >
                {value || ''}
              </div>
            );
          }),
        )}
      </div>

      <div className="flex flex-wrap gap-1 justify-center max-w-xs" aria-label="number-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            aria-label={`number-${n}`}
            onClick={() => place(n)}
            className="w-9 h-9 rounded border bg-card hover:bg-muted text-sm font-mono font-semibold transition-colors"
          >
            {n}
          </button>
        ))}
        <button
          aria-label="clear"
          onClick={() => place(0)}
          className="w-9 h-9 rounded border bg-card hover:bg-muted text-xs font-mono transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}