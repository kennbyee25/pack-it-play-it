import { PieceShape, ShapeMatrix } from '@/types/game';

// Classic Tetris-style polyominoes (tetrominoes) plus some triominoes and pentominoes
export const SHAPES: PieceShape[] = [
  // Triominoes (3 cells)
  {
    name: 'I3',
    cells: [[0, 0], [1, 0], [2, 0]],
    width: 3,
    height: 1,
  },
  {
    name: 'L3',
    cells: [[0, 0], [0, 1], [1, 1]],
    width: 2,
    height: 2,
  },
  
  // Tetrominoes (4 cells) - Classic Tetris shapes
  {
    name: 'I4',
    cells: [[0, 0], [1, 0], [2, 0], [3, 0]],
    width: 4,
    height: 1,
  },
  {
    name: 'O',
    cells: [[0, 0], [1, 0], [0, 1], [1, 1]],
    width: 2,
    height: 2,
  },
  {
    name: 'T',
    cells: [[0, 0], [1, 0], [2, 0], [1, 1]],
    width: 3,
    height: 2,
  },
  {
    name: 'S',
    cells: [[1, 0], [2, 0], [0, 1], [1, 1]],
    width: 3,
    height: 2,
  },
  {
    name: 'Z',
    cells: [[0, 0], [1, 0], [1, 1], [2, 1]],
    width: 3,
    height: 2,
  },
  {
    name: 'J',
    cells: [[0, 0], [0, 1], [1, 1], [2, 1]],
    width: 3,
    height: 2,
  },
  {
    name: 'L',
    cells: [[2, 0], [0, 1], [1, 1], [2, 1]],
    width: 3,
    height: 2,
  },
  
  // Pentominoes (5 cells) - For harder puzzles
  {
    name: 'F',
    cells: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
    width: 3,
    height: 3,
  },
  {
    name: 'P',
    cells: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]],
    width: 2,
    height: 3,
  },
  {
    name: 'U',
    cells: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
    width: 3,
    height: 2,
  },
  {
    name: 'W',
    cells: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
    width: 3,
    height: 3,
  },
];

// Rotate a shape 90 degrees clockwise
export function rotateShape(shape: PieceShape): PieceShape {
  const rotated: ShapeMatrix = shape.cells.map(([x, y]) => [shape.height - 1 - y, x]);
  
  // Normalize to origin
  const minX = Math.min(...rotated.map(([x]) => x));
  const minY = Math.min(...rotated.map(([, y]) => y));
  const normalized: ShapeMatrix = rotated.map(([x, y]) => [x - minX, y - minY]);
  
  return {
    name: shape.name,
    cells: normalized,
    width: shape.height,
    height: shape.width,
  };
}

// Get all unique rotations of a shape
export function getAllRotations(shape: PieceShape): PieceShape[] {
  const rotations: PieceShape[] = [shape];
  let current = shape;
  
  for (let i = 0; i < 3; i++) {
    current = rotateShape(current);
    // Check if this rotation is unique
    const isUnique = !rotations.some(r => 
      r.width === current.width && 
      r.height === current.height &&
      JSON.stringify(r.cells.sort()) === JSON.stringify(current.cells.sort())
    );
    if (isUnique) {
      rotations.push(current);
    }
  }
  
  return rotations;
}

// Get shape dimensions
export function getShapeBounds(cells: ShapeMatrix): { width: number; height: number } {
  const maxX = Math.max(...cells.map(([x]) => x));
  const maxY = Math.max(...cells.map(([, y]) => y));
  return { width: maxX + 1, height: maxY + 1 };
}
