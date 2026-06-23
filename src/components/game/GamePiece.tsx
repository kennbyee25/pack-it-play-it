import { Piece } from '@/types/game';
import { cn } from '@/lib/utils';

interface GamePieceProps {
  piece: Piece;
  cellSize: number;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent, piece: Piece) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isInBin?: boolean;
  style?: React.CSSProperties;
}

export function GamePiece({
  piece,
  cellSize,
  isDragging,
  onDragStart,
  onDragEnd,
  isInBin,
  style,
}: GamePieceProps) {
  const width = piece.width * cellSize - 4;
  const height = piece.height * cellSize - 4;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, piece)}
      onDragEnd={onDragEnd}
      className={cn(
        'game-piece animate-pop-in select-none',
        piece.color,
        isDragging && 'dragging opacity-80',
        isInBin && 'absolute'
      )}
      style={{
        width,
        height,
        margin: 2,
        ...style,
      }}
    >
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-white/30" />
      </div>
    </div>
  );
}
