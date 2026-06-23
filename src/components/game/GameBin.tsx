import { Piece } from '@/types/game';
import { GamePiece } from './GamePiece';
import { cn } from '@/lib/utils';

interface GameBinProps {
  width: number;
  height: number;
  cellSize: number;
  grid: (string | null)[][];
  pieces: Piece[];
  onDrop: (x: number, y: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onPieceDragStart: (e: React.DragEvent, piece: Piece) => void;
  onPieceDragEnd: () => void;
  isValidDrop: boolean;
  dropPreview: { x: number; y: number; piece: Piece } | null;
}

export function GameBin({
  width,
  height,
  cellSize,
  grid,
  pieces,
  onDrop,
  onDragOver,
  onPieceDragStart,
  onPieceDragEnd,
  isValidDrop,
  dropPreview,
}: GameBinProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropPreview) {
      onDrop(dropPreview.x, dropPreview.y);
    }
  };

  const placedPieces = pieces.filter((p) => p.placed && p.x !== undefined && p.y !== undefined);

  return (
    <div
      className="relative bg-grid-bg rounded-xl border-4 border-grid-border shadow-xl overflow-hidden"
      style={{
        width: width * cellSize,
        height: height * cellSize,
      }}
      onDragOver={onDragOver}
      onDrop={handleDrop}
    >
      {/* Grid lines */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: height }).map((_, y) =>
          Array.from({ length: width }).map((_, x) => (
            <div
              key={`${x}-${y}`}
              className={cn(
                'absolute border border-grid-line/30',
                grid[y][x] === null && 'bg-grid-empty/50'
              )}
              style={{
                left: x * cellSize,
                top: y * cellSize,
                width: cellSize,
                height: cellSize,
              }}
            />
          ))
        )}
      </div>

      {/* Drop preview */}
      {dropPreview && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: dropPreview.x * cellSize,
            top: dropPreview.y * cellSize,
          }}
        >
          <GamePiece
            piece={dropPreview.piece}
            cellSize={cellSize}
            isPreview
            isValid={isValidDrop}
          />
        </div>
      )}

      {/* Placed pieces */}
      {placedPieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute z-20"
          style={{
            left: piece.x! * cellSize,
            top: piece.y! * cellSize,
          }}
        >
          <GamePiece
            piece={piece}
            cellSize={cellSize}
            onDragStart={onPieceDragStart}
            onDragEnd={onPieceDragEnd}
          />
        </div>
      ))}
    </div>
  );
}
