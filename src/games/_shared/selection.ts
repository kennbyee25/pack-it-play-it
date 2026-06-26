// Most puzzles model the player's state as a boolean `selected` array (which
// subsets/items/nodes are picked) and their only move is to toggle one index.
// Eleven games had a byte-identical immutable toggle; this is that move, once.
export function toggleSelected<S extends { selected: boolean[] }>(state: S, index: number): S {
  const selected = [...state.selected];
  selected[index] = !selected[index];
  return { ...state, selected };
}

// The indices that are currently selected — several verifiers/progress
// functions reconstructed this with the same map(v?i:-1).filter(>=0) dance.
export const pickedIndices = (selected: readonly boolean[]): number[] =>
  selected.reduce<number[]>((acc, on, i) => (on ? (acc.push(i), acc) : acc), []);

// How many are selected.
export const selectionCount = (selected: readonly boolean[]): number =>
  selected.reduce((n, on) => (on ? n + 1 : n), 0);
