import { Piece } from '@/types/game';
import { GamePiece } from './GamePiece';

interface PiecesTrayProps {
  pieces: Piece[];
  cellSize: number;
  onDragStart: (e: React.DragEvent, piece: Piece) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function PiecesTray({
  pieces,
  cellSize,
  onDragStart,
  onDragEnd,
  onDrop,
}: PiecesTrayProps) {
  const unplacedPieces = pieces.filter((p) => !p.placed);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div
      className="min-h-[120px] p-4 rounded-xl bg-card border border-border shadow-sm"
      onDragOver={handleDragOver}
      onDrop={onDrop}
    >
      <h3 className="font-display font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
        Pieces to Pack
      </h3>
      <div className="flex flex-wrap gap-2 items-start">
        {unplacedPieces.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">All pieces placed! 🎉</p>
        ) : (
          unplacedPieces.map((piece) => (
            <GamePiece
              key={piece.id}
              piece={piece}
              cellSize={cellSize}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}
