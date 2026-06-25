import { Fragment, useRef } from 'react';
import type { NonogramState, NonogramMove } from '../nonogram';
import type { BoardProps } from './types';

// nonogram archetype. A grid of cells with row/column run-length clues.
//
// Interaction: click/tap a cell to fill it (left) or mark it empty (right);
// clicking a cell that's already in that state clears it (deselect). Press and
// drag to paint a run of cells in one stroke — the first cell sets the value
// (fill / mark / clear) and the drag applies it to every cell it crosses.
//
// Layout is one CSS grid: a leading clue column + clue row frame the puzzle.
// The track counts depend on the puzzle size, so the grid template is set via
// inline style — Tailwind can't generate arbitrary, runtime-dynamic class names.
const CELL = 30; // px
// Theme-aware grid lines: faint between cells, bolder on the every-5 guides and
// the outer frame (the classic nonogram reading aid).
const MINOR = 'hsl(var(--border))';
const MAJOR = 'hsl(var(--muted-foreground))';

// Run-lengths of the filled (value 1) cells in a line — marks/blanks are gaps.
function runs(line: number[]): number[] {
  const out: number[] = [];
  let count = 0;
  for (const v of line) {
    if (v === 1) count++;
    else if (count > 0) {
      out.push(count);
      count = 0;
    }
  }
  if (count > 0) out.push(count);
  return out;
}

// A line is "satisfied" when its filled runs exactly match its clue (an empty
// clue, shown as 0, is satisfied by a line with nothing filled).
function satisfied(clue: number[], line: number[]): boolean {
  const r = runs(line);
  return r.length === clue.length && clue.every((n, i) => n === r[i]);
}

export function NonogramBoard({ state, onMove }: BoardProps<NonogramState, NonogramMove>) {
  const { rows, cols, rowClues, colClues, grid } = state;
  const gridRef = useRef<HTMLDivElement>(null);

  // Drag-to-paint state. `paintValue` is the value the current stroke writes;
  // `painted` guards each cell so a stroke toggles it at most once.
  const paintValue = useRef<0 | 1 | 2 | null>(null);
  const painted = useRef<Set<string>>(new Set());

  const paint = (r: number, c: number) => {
    const v = paintValue.current;
    if (v === null) return;
    const key = `${r}-${c}`;
    if (painted.current.has(key)) return;
    painted.current.add(key);
    onMove({ row: r, col: c, value: v });
  };

  // Start a stroke on (r,c). Right button paints "mark", left paints "fill";
  // either clears the cell if it's already in that state (so a click deselects).
  const begin = (r: number, c: number, button: number) => {
    const cur = grid[r][c];
    paintValue.current = button === 2 ? (cur === 2 ? 0 : 2) : cur === 1 ? 0 : 1;
    painted.current = new Set();
    paint(r, c);
  };

  const end = () => {
    paintValue.current = null;
    painted.current = new Set();
  };

  // The puzzle cell under a client point — used to follow a drag across cells
  // (works for both mouse and touch, since the pointer is captured by the grid).
  const cellAt = (x: number, y: number): [number, number] | null => {
    const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cell]');
    if (!cell) return null;
    return [Number(cell.dataset.r), Number(cell.dataset.c)];
  };

  // Which rows/columns currently match their clue — their clues get crossed off.
  const rowDone = rowClues.map((clue, r) => satisfied(clue, grid[r]));
  const colDone = colClues.map((clue, c) => satisfied(clue, grid.map((row) => row[c])));
  const clueDone = 'opacity-40 line-through';

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-muted-foreground tabular-nums" aria-label="grid-size">
        {rows} × {cols}
      </span>

      <div
        ref={gridRef}
        className="inline-grid select-none"
        style={{
          gridTemplateColumns: `max-content repeat(${cols}, ${CELL}px)`,
          gridTemplateRows: `max-content repeat(${rows}, ${CELL}px)`,
          touchAction: 'none', // let us drive drag-paint instead of scrolling
        }}
        onPointerMove={(e) => {
          if (paintValue.current === null) return;
          const c = cellAt(e.clientX, e.clientY);
          if (c) paint(c[0], c[1]);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Top-left corner (empty) */}
        <div />

        {/* Column clues (top): each column's runs stacked vertically. */}
        {colClues.map((clues, colIdx) => (
          <div
            key={`col-${colIdx}`}
            aria-label={`col-clue-${colIdx}`}
            className={`flex flex-col items-center justify-end px-1 pb-1 text-xs leading-tight text-muted-foreground tabular-nums ${
              colDone[colIdx] ? clueDone : ''
            }`}
          >
            {(clues.length ? clues : [0]).map((num, i) => (
              <span key={i}>{num}</span>
            ))}
          </div>
        ))}

        {/* Each puzzle row: leading row-clue cell, then the cells. */}
        {Array.from({ length: rows }, (_, r) => (
          <Fragment key={`row-${r}`}>
            <div
              aria-label={`row-clue-${r}`}
              className={`flex items-center justify-end gap-1 pr-2 text-xs leading-tight text-muted-foreground tabular-nums ${
                rowDone[r] ? clueDone : ''
              }`}
            >
              {(rowClues[r].length ? rowClues[r] : [0]).map((num, i) => (
                <span key={i}>{num}</span>
              ))}
            </div>

          {Array.from({ length: cols }, (_, c) => {
            const v = grid[r][c];
            const topMajor = r % 5 === 0;
            const leftMajor = c % 5 === 0;
            return (
              <div
                key={`${r}-${c}`}
                data-cell=""
                data-r={r}
                data-c={c}
                role="button"
                aria-label={`cell-${r}-${c}`}
                onPointerDown={(e) => {
                  if (e.button === 2) e.preventDefault();
                  try {
                    gridRef.current?.setPointerCapture(e.pointerId);
                  } catch {
                    /* not supported (e.g. jsdom) — single clicks still work */
                  }
                  begin(r, c, e.button);
                }}
                className={`flex items-center justify-center text-xs font-mono cursor-pointer ${
                  v === 1 ? 'bg-piece-teal' : v === 2 ? 'bg-piece-coral/20' : 'bg-input'
                }`}
                style={{
                  borderTop: `${topMajor ? 2 : 1}px solid ${topMajor ? MAJOR : MINOR}`,
                  borderLeft: `${leftMajor ? 2 : 1}px solid ${leftMajor ? MAJOR : MINOR}`,
                  ...(c === cols - 1 ? { borderRight: `2px solid ${MAJOR}` } : null),
                  ...(r === rows - 1 ? { borderBottom: `2px solid ${MAJOR}` } : null),
                }}
              >
                {v === 2 ? '✕' : ''}
              </div>
            );
          })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
