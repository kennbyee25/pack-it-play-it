// Most puzzles model the player's state as a boolean `selected` array (which
// subsets/items/nodes are picked) and their only move is to toggle one index.
// Eleven games had a byte-identical immutable toggle; this is that move, once.
export function toggleSelected<S extends { selected: boolean[] }>(state: S, index: number): S {
  const selected = [...state.selected];
  selected[index] = !selected[index];
  return { ...state, selected };
}
