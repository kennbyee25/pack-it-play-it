import { describe, it, expect } from 'vitest';
import { SHAPES, rotateShape, getAllRotations } from './polyominoes';
import type { PieceShape } from '@/types/game';

const T_SHAPE = SHAPES.find((s) => s.name === 'T')!;
const O_SHAPE = SHAPES.find((s) => s.name === 'O')!;
const I4 = SHAPES.find((s) => s.name === 'I4')!;

const cellCount = (s: PieceShape) => s.cells.length;
const key = (s: PieceShape) =>
  [...s.cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(String).join('|');

describe('SHAPES catalog', () => {
  it('has unique names and well-formed bounds', () => {
    const names = SHAPES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    for (const s of SHAPES) {
      const maxX = Math.max(...s.cells.map(([x]) => x));
      const maxY = Math.max(...s.cells.map(([, y]) => y));
      expect(s.width).toBe(maxX + 1);
      expect(s.height).toBe(maxY + 1);
    }
  });
});

describe('rotateShape', () => {
  it('preserves cell count', () => {
    expect(cellCount(rotateShape(T_SHAPE))).toBe(cellCount(T_SHAPE));
  });

  it('swaps width and height', () => {
    const r = rotateShape(T_SHAPE);
    expect(r.width).toBe(T_SHAPE.height);
    expect(r.height).toBe(T_SHAPE.width);
  });

  it('normalizes back to the origin (non-negative, min 0)', () => {
    const r = rotateShape(I4);
    const minX = Math.min(...r.cells.map(([x]) => x));
    const minY = Math.min(...r.cells.map(([, y]) => y));
    expect(minX).toBe(0);
    expect(minY).toBe(0);
  });

  it('returns to the original after four rotations', () => {
    let s = T_SHAPE;
    for (let i = 0; i < 4; i++) s = rotateShape(s);
    expect(key(s)).toBe(key(T_SHAPE));
  });
});

describe('getAllRotations', () => {
  it('yields a single orientation for the symmetric O piece', () => {
    expect(getAllRotations(O_SHAPE)).toHaveLength(1);
  });

  it('yields two distinct orientations for the I4 bar', () => {
    const rots = getAllRotations(I4);
    expect(rots).toHaveLength(2);
    expect(new Set(rots.map(key)).size).toBe(2);
  });

  it('yields four orientations for the T piece', () => {
    expect(getAllRotations(T_SHAPE)).toHaveLength(4);
  });
});
