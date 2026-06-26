import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import { toggleSelected } from '../_shared/selection';
import { edgeAccumulator } from '../_shared/graph';

export interface IndependentSetState {
  n: number;
  edges: [number, number][];
  selected: boolean[];
  k: number;
  instruction: string;
}
export interface IndependentSetMove {
  node: number;
}

function configFor(d: Difficulty) {
  const k = Math.max(3, Math.round(3 + d / 900));
  const n = k + Math.max(4, Math.round(4 + d / 300));
  const nonIsDensity = 0.5;
  return { k, n, nonIsDensity };
}


export const independentSet: PuzzleGame<IndependentSetState, IndependentSetMove> = {
  id: 'independent-set',
  name: 'Independent Set',
  archetype: 'graph-select',

  generate(difficulty: Difficulty, rng: Rng): Generated<IndependentSetState, IndependentSetMove> {
    const { k, n, nonIsDensity } = configFor(difficulty);
    const allNodes = rng.shuffle(Array.from({ length: n }, (_, i) => i));
    const isNodes = new Set(allNodes.slice(0, k));
    const nonIsNodes = allNodes.slice(k);

    const acc = edgeAccumulator();

    // Add edges among non-IS nodes (dense)
    for (let i = 0; i < nonIsNodes.length; i++) {
      for (let j = i + 1; j < nonIsNodes.length; j++) {
        if (rng.next() < nonIsDensity) acc.add(nonIsNodes[i], nonIsNodes[j]);
      }
    }

    // Add edges from IS nodes to non-IS nodes (no edges between IS nodes)
    for (const isNode of isNodes) {
      for (const nonNode of nonIsNodes) {
        if (rng.next() < 0.4) acc.add(isNode, nonNode);
      }
    }

    // Ensure at least some edges exist
    if (acc.edges.length === 0 && nonIsNodes.length > 0) {
      acc.add(nonIsNodes[0], allNodes[k > 0 ? k : 0]);
    }

    const puzzle: IndependentSetState = {
      n,
      edges: rng.shuffle(acc.edges),
      selected: Array(n).fill(false),
      k,
      instruction: `Select ${k} nodes with no two connected by an edge`,
    };
    const solution: IndependentSetMove[] = [...isNodes].map((node) => ({ node }));
    return { puzzle, solution };
  },

  applyMove: (state, move) => toggleSelected(state, move.node),

  isSolved(state) {
    const sel = state.selected;
    if (sel.filter(Boolean).length !== state.k) return false;
    for (const [a, b] of state.edges) {
      if (sel[a] && sel[b]) return false;
    }
    return true;
  },

  progress(state) {
    const sel = state.selected;
    // If any two selected nodes are adjacent, return 0
    for (const [a, b] of state.edges) {
      if (sel[a] && sel[b]) return 0;
    }
    const count = sel.filter(Boolean).length;
    return Math.round((count / state.k) * 100);
  },
};
