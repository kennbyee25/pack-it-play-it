import { Piece, GameState, PieceColor } from '@/types/game';

const COLORS: PieceColor[] = [
  'piece-coral',
  'piece-teal',
  'piece-amber',
  'piece-violet',
  'piece-sky',
  'piece-rose',
  'piece-emerald',
  'piece-orange',
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateGame(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): GameState {
  const binWidth = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 10 : 12;
  const binHeight = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 10 : 12;
  
  // Generate pieces that can fit perfectly (with some slack)
  const totalArea = binWidth * binHeight;
  const targetFill = difficulty === 'easy' ? 0.7 : difficulty === 'medium' ? 0.8 : 0.85;
  const targetArea = Math.floor(totalArea * targetFill);
  
  const pieces: Piece[] = [];
  let currentArea = 0;
  let colorIndex = 0;
  
  // Generate varied piece sizes
  const possibleSizes = [
    { w: 1, h: 2 }, { w: 2, h: 1 },
    { w: 2, h: 2 },
    { w: 1, h: 3 }, { w: 3, h: 1 },
    { w: 2, h: 3 }, { w: 3, h: 2 },
    { w: 1, h: 4 }, { w: 4, h: 1 },
    { w: 2, h: 4 }, { w: 4, h: 2 },
    { w: 3, h: 3 },
  ].filter(s => s.w <= binWidth && s.h <= binHeight);
  
  while (currentArea < targetArea) {
    const remaining = targetArea - currentArea;
    const validSizes = possibleSizes.filter(s => s.w * s.h <= remaining);
    
    if (validSizes.length === 0) break;
    
    const size = validSizes[Math.floor(Math.random() * validSizes.length)];
    
    pieces.push({
      id: generateId(),
      width: size.w,
      height: size.h,
      color: COLORS[colorIndex % COLORS.length],
      placed: false,
    });
    
    currentArea += size.w * size.h;
    colorIndex++;
  }
  
  // Initialize empty grid
  const grid: (string | null)[][] = Array(binHeight)
    .fill(null)
    .map(() => Array(binWidth).fill(null));
  
  return {
    pieces: shuffleArray(pieces),
    binWidth,
    binHeight,
    grid,
  };
}

export function canPlacePiece(
  grid: (string | null)[][],
  piece: Piece,
  x: number,
  y: number,
  binWidth: number,
  binHeight: number
): boolean {
  // Check bounds
  if (x < 0 || y < 0 || x + piece.width > binWidth || y + piece.height > binHeight) {
    return false;
  }
  
  // Check for overlaps
  for (let dy = 0; dy < piece.height; dy++) {
    for (let dx = 0; dx < piece.width; dx++) {
      if (grid[y + dy][x + dx] !== null) {
        return false;
      }
    }
  }
  
  return true;
}

export function placePiece(
  grid: (string | null)[][],
  piece: Piece,
  x: number,
  y: number
): (string | null)[][] {
  const newGrid = grid.map(row => [...row]);
  
  for (let dy = 0; dy < piece.height; dy++) {
    for (let dx = 0; dx < piece.width; dx++) {
      newGrid[y + dy][x + dx] = piece.id;
    }
  }
  
  return newGrid;
}

export function removePiece(
  grid: (string | null)[][],
  pieceId: string
): (string | null)[][] {
  return grid.map(row => row.map(cell => (cell === pieceId ? null : cell)));
}

export function calculateEfficiency(grid: (string | null)[][]): number {
  const totalCells = grid.length * grid[0].length;
  const filledCells = grid.flat().filter(cell => cell !== null).length;
  return Math.round((filledCells / totalCells) * 100);
}
