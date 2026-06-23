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
  onPieceDragEnd: (e: React.DragEvent) => void;
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
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    onDrop(x, y);
  };

  const placedPieces = pieces.filter((p) => p.placed && p.x !== undefined && p.y !== undefined);

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden bg-grid-bg game-grid border-2 transition-colors duration-200',
        isValidDrop ? 'border-accent' : 'border-border'
      )}
      style={{
        width: width * cellSize,
        height: height * cellSize,
        backgroundSize: `${cellSize}px ${cellSize}px`,
      }}
      onDrop={handleDrop}
      onDragOver={onDragOver}
    >
      {/* Drop preview */}
      {dropPreview && (
        <div
          className={cn(
            'absolute rounded-lg transition-all duration-100 pointer-events-none',
            isValidDrop ? 'bg-accent/30 border-2 border-accent' : 'bg-destructive/30 border-2 border-destructive'
          )}
          style={{
            left: dropPreview.x * cellSize + 2,
            top: dropPreview.y * cellSize + 2,
            width: dropPreview.piece.width * cellSize - 4,
            height: dropPreview.piece.height * cellSize - 4,
          }}
        />
      )}

      {/* Placed pieces */}
      {placedPieces.map((piece) => (
        <GamePiece
          key={piece.id}
          piece={piece}
          cellSize={cellSize}
          isInBin
          onDragStart={onPieceDragStart}
          onDragEnd={onPieceDragEnd}
          style={{
            left: piece.x! * cellSize,
            top: piece.y! * cellSize,
          }}
        />
      ))}
    </div>
  );
}
