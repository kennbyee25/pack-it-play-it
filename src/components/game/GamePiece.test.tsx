import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GamePiece } from './GamePiece';
import { SHAPES } from '@/utils/polyominoes';
import type { Piece } from '@/types/game';

const makePiece = (shapeName: string): Piece => ({
  id: 'p1',
  shape: SHAPES.find((s) => s.name === shapeName)!,
  color: 'piece-teal',
  placed: false,
});

describe('GamePiece', () => {
  it('renders one cell element per shape cell', () => {
    const piece = makePiece('T'); // 4 cells
    const { container } = render(<GamePiece piece={piece} cellSize={40} />);
    const cells = container.querySelectorAll('.piece-teal');
    expect(cells).toHaveLength(piece.shape.cells.length);
  });

  it('sizes the wrapper to the shape bounds', () => {
    const piece = makePiece('I4'); // 4 wide, 1 tall
    const { container } = render(<GamePiece piece={piece} cellSize={40} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.width).toBe(`${piece.shape.width * 40}px`);
    expect(wrapper.style.height).toBe(`${piece.shape.height * 40}px`);
  });

  it('is draggable when not a preview', () => {
    const { container } = render(<GamePiece piece={makePiece('O')} cellSize={40} />);
    expect((container.firstElementChild as HTMLElement).getAttribute('draggable')).toBe('true');
  });
});
