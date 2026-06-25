import type { NonogramState, NonogramMove } from '../nonogram';
import type { BoardProps } from './types';

// nonogram archetype. A grid of cells with row/column run-length clues. Left
// click fills a cell, right click marks it as empty (a known-blank).
//
// Layout is one CSS grid: a leading clue column + clue row frame the puzzle.
// The track counts depend on the puzzle size, so the grid template is set via
// inline style — Tailwind can't generate arbitrary, runtime-dynamic class names.
const CELL = 28; // px

export function NonogramBoard({ state, onMove }: BoardProps<NonogramState, NonogramMove>) {
  const { rows, cols, rowClues, colClues, grid } = state;

  const handleCellClick = (r: number, c: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      onMove({ row: r, col: c, value: 1 }); // left click -> fill
    } else if (e.button === 2) {
      e.preventDefault(); // suppress the context menu
      onMove({ row: r, col: c, value: 2 }); // right click -> mark empty
    }
  };

  return (
    <div
      className="inline-grid gap-px select-none"
      style={{
        gridTemplateColumns: `max-content repeat(${cols}, ${CELL}px)`,
        gridTemplateRows: `max-content repeat(${rows}, ${CELL}px)`,
      }}
    >
      {/* Top-left corner (empty) */}
      <div />

      {/* Column clues (top): each column's runs stacked vertically. */}
      {colClues.map((clues, colIdx) => (
        <div
          key={`col-${colIdx}`}
          className="flex flex-col items-center justify-end px-1 pb-1 text-xs leading-tight text-muted-foreground tabular-nums"
        >
          {(clues.length ? clues : [0]).map((num, i) => (
            <span key={i}>{num}</span>
          ))}
        </div>
      ))}

      {/* Each puzzle row: leading row-clue cell, then the cells. */}
      {Array.from({ length: rows }, (_, r) => (
        <Row
          key={`row-${r}`}
          r={r}
          cols={cols}
          rowClues={rowClues[r]}
          grid={grid}
          onCell={handleCellClick}
        />
      ))}
    </div>
  );
}

function Row({
  r,
  cols,
  rowClues,
  grid,
  onCell,
}: {
  r: number;
  cols: number;
  rowClues: number[];
  grid: number[][];
  onCell: (r: number, c: number, e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <>
      {/* Row clues (left): this row's runs laid out horizontally. */}
      <div className="flex items-center justify-end gap-1 pr-2 text-xs leading-tight text-muted-foreground tabular-nums">
        {(rowClues.length ? rowClues : [0]).map((num, i) => (
          <span key={i}>{num}</span>
        ))}
      </div>

      {Array.from({ length: cols }, (_, c) => {
        const v = grid[r][c];
        return (
          <div
            key={`${r}-${c}`}
            role="button"
            aria-label={`cell-${r}-${c}`}
            onMouseDown={(e) => onCell(r, c, e)}
            onContextMenu={(e) => e.preventDefault()}
            className={`flex items-center justify-center text-xs font-mono cursor-pointer outline outline-1 outline-border ${
              v === 1 ? 'bg-piece-teal' : v === 2 ? 'bg-piece-coral/20' : 'bg-input'
            }`}
          >
            {v === 2 ? '✕' : ''}
          </div>
        );
      })}
    </>
  );
}
