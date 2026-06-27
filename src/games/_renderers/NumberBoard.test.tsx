import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { NumberBoard } from './NumberBoard';

afterEach(cleanup);

describe('NumberBoard — knapsack variant', () => {
  const knapsack = {
    items: [
      { value: 4, weight: 3 },
      { value: 2, weight: 5 },
    ],
    selected: [true, false],
    target: 6, // weight capacity
    valueTarget: 5,
    targetLabel: 'Capacity',
    instruction: 'pack it',
  };

  it('shows running weight vs capacity and value vs goal (a meter, not a value-sum)', () => {
    render(<NumberBoard state={knapsack} onMove={vi.fn()} />);
    expect(screen.getByLabelText('weight-readout').textContent).toContain('3 / 6');
    expect(screen.getByLabelText('value-readout').textContent).toContain('4 / 5');
    expect(screen.getByLabelText('weight-meter')).toBeTruthy();
  });

  it('flags going over capacity', () => {
    render(<NumberBoard state={{ ...knapsack, selected: [true, true] }} onMove={vi.fn()} />);
    // 3 + 5 = 8 > capacity 6
    expect(screen.getByLabelText('weight-readout').textContent).toContain('over');
  });

  it('toggles an item on click', () => {
    const onMove = vi.fn();
    render(<NumberBoard state={knapsack} onMove={onMove} />);
    fireEvent.click(screen.getByLabelText('item-1'));
    expect(onMove).toHaveBeenCalledWith({ itemIndex: 1 });
  });
});

describe('NumberBoard — subset-sum variant (no weight)', () => {
  const subsetSum = {
    items: [{ value: 7 }, { value: 3 }],
    selected: [true, false],
    target: 10,
    targetLabel: 'Target',
    instruction: 'reach the target',
  };

  it('shows a plain value sum vs target (no meter)', () => {
    render(<NumberBoard state={subsetSum} onMove={vi.fn()} />);
    expect(screen.getByText('Sum: 7')).toBeTruthy();
    expect(screen.queryByLabelText('weight-meter')).toBeNull();
  });
});
