import { Piece, GameState, PieceColor, PieceShape } from '@/types/game';
import { SHAPES, getAllRotations } from './polyominoes';

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

// Check if a shape can be placed at position
function canPlace(
  grid: (string | null)[][],
  shape: PieceShape,
  x: number,
  y: number,
  binWidth: number,
  binHeight: number
): boolean {
  for (const [dx, dy] of shape.cells) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= binWidth || ny < 0 || ny >= binHeight) {
      return false;
    }
    if (grid[ny][nx] !== null) {
      return false;
    }
  }
  return true;
}

// Place a shape on the grid
function place(
  grid: (string | null)[][],
  shape: PieceShape,
  x: number,
  y: number,
  id: string
): void {
  for (const [dx, dy] of shape.cells) {
    grid[y + dy][x + dx] = id;
  }
}

// Remove a shape from the grid
function unplace(grid: (string | null)[][], id: string): void {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x] === id) {
        grid[y][x] = null;
      }
    }
  }
}

// Find first empty cell
function findFirstEmpty(grid: (string | null)[][]): [number, number] | null {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x] === null) {
        return [x, y];
      }
    }
  }
  return null;
}

interface PlacedPiece {
  shape: PieceShape;
  x: number;
  y: number;
  id: string;
  color: PieceColor;
}

// Generate a solvable puzzle by filling the bin completely
function generateSolvedPuzzle(
  binWidth: number,
  binHeight: number,
  allowedShapes: PieceShape[]
): PlacedPiece[] | null {
  const grid: (string | null)[][] = Array(binHeight)
    .fill(null)
    .map(() => Array(binWidth).fill(null));
  
  const placedPieces: PlacedPiece[] = [];
  let colorIndex = 0;
  
  function solve(): boolean {
    const empty = findFirstEmpty(grid);
    if (!empty) {
      return true; // Grid is full!
    }
    
    const [ex, ey] = empty;
    
    // Try each shape in random order
    const shuffledShapes = shuffleArray([...allowedShapes]);
    
    for (const baseShape of shuffledShapes) {
      // Try all rotations
      const rotations = getAllRotations(baseShape);
      const shuffledRotations = shuffleArray(rotations);
      
      for (const shape of shuffledRotations) {
        // Try to place so that the shape covers the empty cell
        for (const [dx, dy] of shape.cells) {
          const px = ex - dx;
          const py = ey - dy;
          
          if (canPlace(grid, shape, px, py, binWidth, binHeight)) {
            const id = generateId();
            place(grid, shape, px, py, id);
            placedPieces.push({
              shape,
              x: px,
              y: py,
              id,
              color: COLORS[colorIndex % COLORS.length],
            });
            colorIndex++;
            
            if (solve()) {
              return true;
            }
            
            // Backtrack
            unplace(grid, id);
            placedPieces.pop();
            colorIndex--;
          }
        }
      }
    }
    
    return false;
  }
  
  if (solve()) {
    return placedPieces;
  }
  
  return null;
}

export function generateGame(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): GameState {
  const config = {
    easy: { width: 4, height: 4, shapes: SHAPES.slice(0, 4) }, // Simple shapes, small bin
    medium: { width: 5, height: 5, shapes: SHAPES.slice(0, 9) }, // Tetrominoes
    hard: { width: 6, height: 5, shapes: SHAPES }, // All shapes including pentominoes
  };
  
  const { width, height, shapes } = config[difficulty];
  
  // Generate solved puzzle
  const solved = generateSolvedPuzzle(width, height, shapes);
  
  if (!solved) {
    // Fallback: try with simpler config
    const fallbackSolved = generateSolvedPuzzle(4, 4, SHAPES.slice(0, 4));
    if (!fallbackSolved) {
      throw new Error('Failed to generate puzzle');
    }
    return createGameState(fallbackSolved, 4, 4);
  }
  
  return createGameState(solved, width, height);
}

function createGameState(solved: PlacedPiece[], binWidth: number, binHeight: number): GameState {
  // Create pieces without placement info
  const pieces: Piece[] = shuffleArray(solved).map(p => ({
    id: p.id,
    shape: p.shape,
    color: p.color,
    placed: false,
  }));
  
  // Empty grid
  const grid: (string | null)[][] = Array(binHeight)
    .fill(null)
    .map(() => Array(binWidth).fill(null));
  
  return {
    pieces,
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
  return canPlace(grid, piece.shape, x, y, binWidth, binHeight);
}

export function placePiece(
  grid: (string | null)[][],
  piece: Piece,
  x: number,
  y: number
): (string | null)[][] {
  const newGrid = grid.map(row => [...row]);
  for (const [dx, dy] of piece.shape.cells) {
    newGrid[y + dy][x + dx] = piece.id;
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
