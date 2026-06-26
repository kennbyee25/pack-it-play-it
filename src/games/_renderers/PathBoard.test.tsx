import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PathBoard } from './PathBoard';
import type { HamiltonianState } from '../hamiltonian';

// Path graph 0-1-2-3 (no 0-3 edge).
const state: HamiltonianState = {
  n: 4,
  edges: [
    [0, 1],
    [1, 2],
    [2, 3],
  ],
  chosen: [],
};

describe('PathBoard node clicking', () => {
  it('clicking two connected nodes toggles their edge', () => {
    const onMove = vi.fn();
    render(<PathBoard state={state} onMove={onMove} />);
    fireEvent.click(screen.getByLabelText('node-0'));
    fireEvent.click(screen.getByLabelText('node-1'));
    expect(onMove).toHaveBeenCalledWith({ edge: [0, 1] });
  });

  it('clicking two non-adjacent nodes does nothing', () => {
    const onMove = vi.fn();
    render(<PathBoard state={state} onMove={onMove} />);
    fireEvent.click(screen.getByLabelText('node-0'));
    fireEvent.click(screen.getByLabelText('node-3')); // no 0-3 edge
    expect(onMove).not.toHaveBeenCalled();
  });

  it('keeps the last node selected so edges chain in one click each', () => {
    const onMove = vi.fn();
    render(<PathBoard state={state} onMove={onMove} />);
    fireEvent.click(screen.getByLabelText('node-0'));
    fireEvent.click(screen.getByLabelText('node-1')); // forms 0-1, leaves 1 selected
    fireEvent.click(screen.getByLabelText('node-2')); // one more click -> forms 1-2
    expect(onMove).toHaveBeenNthCalledWith(1, { edge: [0, 1] });
    expect(onMove).toHaveBeenNthCalledWith(2, { edge: [1, 2] });
  });

  it('clicking an edge directly toggles it', () => {
    const onMove = vi.fn();
    render(<PathBoard state={state} onMove={onMove} />);
    fireEvent.click(screen.getByLabelText('edge-1-2'));
    expect(onMove).toHaveBeenCalledWith({ edge: [1, 2] });
  });
});
