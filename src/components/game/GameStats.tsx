import { cn } from '@/lib/utils';

interface GameStatsProps {
  efficiency: number;
  piecesPlaced: number;
  totalPieces: number;
}

export function GameStats({ efficiency, piecesPlaced, totalPieces }: GameStatsProps) {
  return (
    <div className="flex gap-4">
      <div className="bg-card rounded-xl px-5 py-3 border border-border shadow-sm">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Efficiency</p>
        <p className={cn(
          'text-2xl font-display font-bold',
          efficiency >= 80 ? 'text-accent' : efficiency >= 50 ? 'text-piece-amber' : 'text-foreground'
        )}>
          {efficiency}%
        </p>
      </div>
      <div className="bg-card rounded-xl px-5 py-3 border border-border shadow-sm">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pieces</p>
        <p className="text-2xl font-display font-bold text-foreground">
          {piecesPlaced} <span className="text-muted-foreground text-lg">/ {totalPieces}</span>
        </p>
      </div>
    </div>
  );
}
