import { describe, it, expect } from 'vitest';
import {
  generateGame,
  canPlacePiece,
  placePiece,
  removePiece,
  calculateEfficiency,
} from './puzzleGenerator';
import type { Piece } from '@/types/game';

const emptyGrid = (w: number, h: number): (string | null)[][] =>
  Array(h).fill(null).map(() => Array(w).fill(null));

const totalCells = (pieces: Piece[]) =>
  pieces.reduce((n, p) => n + p.shape.cells.length, 0);

describe('generateGame', () => {
  it.each(['easy', 'medium', 'hard'] as const)(
    'produces a solvable %s puzzle whose pieces exactly tile the bin',
    (difficulty) => {
      const game = generateGame(difficulty);
      expect(game.pieces.length).toBeGreaterThan(0);
      // Guaranteed-solvable invariant: piece cells == bin area (100% fill).
      expect(totalCells(game.pieces)).toBe(game.binWidth * game.binHeight);
      // Fresh game starts empty / unsolved.
      expect(game.pieces.every((p) => !p.placed)).toBe(true);
      expect(calculateEfficiency(game.grid)).toBe(0);
    },
  );
});

describe('placement ops', () => {
  const game = generateGame('easy');
  const piece = game.pieces[0];

  it('canPlacePiece accepts the origin on an empty grid and rejects out of bounds', () => {
    const grid = emptyGrid(game.binWidth, game.binHeight);
    expect(canPlacePiece(grid, piece, 0, 0, game.binWidth, game.binHeight)).toBe(true);
    expect(
      canPlacePiece(grid, piece, game.binWidth, 0, game.binWidth, game.binHeight),
    ).toBe(false);
  });

  it('placePiece is immutable and writes the piece id into covered cells', () => {
    const grid = emptyGrid(game.binWidth, game.binHeight);
    const next = placePiece(grid, piece, 0, 0);
    expect(next).not.toBe(grid);
    expect(grid.flat().every((c) => c === null)).toBe(true);
    expect(next.flat().filter((c) => c === piece.id)).toHaveLength(piece.shape.cells.length);
  });

  it('rejects overlapping placement', () => {
    const grid = placePiece(emptyGrid(game.binWidth, game.binHeight), piece, 0, 0);
    expect(canPlacePiece(grid, piece, 0, 0, game.binWidth, game.binHeight)).toBe(false);
  });

  it('removePiece clears exactly that piece', () => {
    const grid = placePiece(emptyGrid(game.binWidth, game.binHeight), piece, 0, 0);
    const cleared = removePiece(grid, piece.id);
    expect(cleared.flat().every((c) => c === null)).toBe(true);
  });
});

describe('calculateEfficiency', () => {
  it('reports percentage of filled cells', () => {
    const grid = emptyGrid(2, 2);
    expect(calculateEfficiency(grid)).toBe(0);
    grid[0][0] = 'a';
    expect(calculateEfficiency(grid)).toBe(25);
    grid[0][1] = 'a';
    grid[1][0] = 'a';
    grid[1][1] = 'a';
    expect(calculateEfficiency(grid)).toBe(100);
  });
});
