export interface Piece {
  id: string;
  width: number;
  height: number;
  color: string;
  placed: boolean;
  x?: number;
  y?: number;
}

export interface GameState {
  pieces: Piece[];
  binWidth: number;
  binHeight: number;
  grid: (string | null)[][]; // null = empty, string = piece id
}

export type PieceColor = 
  | 'piece-coral'
  | 'piece-teal'
  | 'piece-amber'
  | 'piece-violet'
  | 'piece-sky'
  | 'piece-rose'
  | 'piece-emerald'
  | 'piece-orange';
