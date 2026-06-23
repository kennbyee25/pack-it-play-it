import { Piece } from '@/types/game';
import { cn } from '@/lib/utils';

interface GamePieceProps {
  piece: Piece;
  cellSize: number;
  isDragging?: boolean;
  isPreview?: boolean;
  isValid?: boolean;
  onDragStart?: (e: React.DragEvent, piece: Piece) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isInBin?: boolean;
  style?: React.CSSProperties;
}

export function GamePiece({
  piece,
  cellSize,
  isDragging = false,
  isPreview = false,
  isValid = true,
  onDragStart,
  onDragEnd,
  isInBin,
  style,
}: GamePieceProps) {
  const { shape, color } = piece;
  
  // Calculate bounding box
  const width = shape.width * cellSize;
  const height = shape.height * cellSize;
  
  return (
    <div
      className={cn(
        'relative cursor-grab active:cursor-grabbing transition-all duration-150 game-piece',
        isDragging && 'opacity-50 scale-95',
        isPreview && 'pointer-events-none',
        isPreview && !isValid && 'opacity-40',
        isInBin && 'absolute'
      )}
      style={{
        width,
        height,
        ...style,
      }}
      draggable={!isPreview}
      onDragStart={(e) => onDragStart?.(e, piece)}
      onDragEnd={onDragEnd}
    >
      {shape.cells.map(([x, y], index) => (
        <div
          key={index}
          className={cn(
            'absolute rounded-sm border-2 border-white/30 shadow-sm',
            color,
            isPreview && isValid && 'animate-pulse',
            isPreview && !isValid && 'bg-destructive/50'
          )}
          style={{
            left: x * cellSize + 2,
            top: y * cellSize + 2,
            width: cellSize - 4,
            height: cellSize - 4,
          }}
        />
      ))}
    </div>
  );
}
