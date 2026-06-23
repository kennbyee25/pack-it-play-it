// Polyomino shapes represented as array of [x, y] offsets from origin
export type ShapeMatrix = [number, number][];

export interface PieceShape {
  name: string;
  cells: ShapeMatrix;
  width: number;
  height: number;
}

export interface Piece {
  id: string;
  shape: PieceShape;
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
