import { Piece } from '@/types/game';
import { GamePiece } from './GamePiece';

interface PiecesTrayProps {
  pieces: Piece[];
  cellSize: number;
  onDragStart: (e: React.DragEvent, piece: Piece) => void;
  onDragEnd: () => void;
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
  const scaledCellSize = cellSize * 0.75;

  return (
    <div
      className="relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Pieces ({unplacedPieces.length} remaining)
      </div>
      <div
        className="min-h-[200px] bg-sidebar-bg rounded-xl border-2 border-sidebar-border p-4 flex flex-wrap gap-4 items-start content-start"
      >
        {unplacedPieces.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 text-sm">
            All pieces placed! 🎉
          </div>
        ) : (
          unplacedPieces.map((piece) => (
            <div key={piece.id} className="game-piece">
              <GamePiece
                piece={piece}
                cellSize={scaledCellSize}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
