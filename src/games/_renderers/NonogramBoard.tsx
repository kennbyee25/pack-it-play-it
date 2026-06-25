import type { NonogramState, NonogramMove } from '../nonogram';
import type { BoardProps } from './types';

export function NonogramBoard({ state, onMove }: BoardProps<NonogramState, NonogramMove>) {
  const { rows, cols, rowClues, colClues, grid } = state;

  const handleCellClick = (r: number, c: number, e: React.MouseEvent<HTMLDivElement>) => {
    // Left click -> fill (1), right click -> mark (2)
    if (e.button === 0) {
      // left click
      onMove({ row: r, col: c, value: 1 });
    } else if (e.button === 2) {
      // right click
      e.preventDefault(); // prevent context menu
      onMove({ row: r, col: c, value: 2 });
    }
  };

  return (
    <div className="relative">
      {/* Top-left corner (empty) */}
      <div className="w-[40px] h-[40px]" />

      {/* Column clues (top) */}
      <div className="absolute left-[40px] top-0 right-0 h-[40px] flex items-center justify-center overflow-x-auto space-x-2">
        {colClues.map((clues, colIdx) => (
          <div key={colIdx} className="flex flex-col items-center text-xs text-muted-foreground">
            {clues.map((num, i) => (
              <span key={i} className="mb-[2px]">{num}</span>
            ))}
          </div>
        ))}
      </div>

      {/* Row clues (left) */}
      <div className="absolute top-[40px] left-0 w-[40px] bottom-0 flex items-center justify-center overflow-y-auto space-y-2">
        {rowClues.map((clues, rowIdx) => (
          <div key={rowIdx} className="flex items-center justify-end text-xs text-muted-foreground w-full">
            {clues.map((num, i) => (
              <span key={i} className="mb-[2px]">{num}</span>
            ))}
          </div>
        ))}
      </div>

      {/* Puzzle grid */}
      <div className="absolute top-[40px] left-[40px] bottom-0 right-0 grid grid-cols-[repeat(${cols},minmax(28px,1fr))] grid-rows-[repeat(${rows},minmax(28px,1fr))] gap-0.5 outline outline-offset-0 outline-1 outline-border">
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <div
              key={`${r}-${c}`}
              onClick={(e) => handleCellClick(r, c, e)}
              onContextMenu={(e) => {
                e.preventDefault();
                handleCellClick(r, c, e);
              }}
              className={`flex items-center justify-center text-xs font-mono ${
                grid[r][c] === 1
                  ? 'bg-piece-teal'
                  : grid[r][c] === 2
                  ? 'bg-piece-coral/20'
                  : 'bg-input'
              }`}
            >
              {grid[r][c] === 1 ? '■' : grid[r][c] === 2 ? '△' : ''}
            </div>
          ))
        ).flat()}
      </div>
    </div>
  );
}