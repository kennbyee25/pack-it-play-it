import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import { edgeKey } from '../_shared/graph';

// Chromatic Number (graph-select archetype): color nodes so no edge joins two
// nodes of the same color, using at most k colors.
export interface ColoringState {
  n: number;
  edges: [number, number][]; // undirected, a < b
  k: number;
  colors: (number | null)[]; // colors[node] in [0,k) or null
}
export interface ColorMove {
  node: number;
  color: number;
}


function configFor(d: Difficulty) {
  const n = Math.max(4, Math.round(4 + d / 250)); // ~4..14 nodes
  const k = Math.min(4, Math.max(2, Math.round(2 + d / 800)));
  const density = 0.35 + Math.min(0.35, d / 4000); // edge probability
  return { n, k, density };
}

export const graphColoring: PuzzleGame<ColoringState, ColorMove> = {
  id: 'graph-coloring',
  name: 'Graph Coloring',
  archetype: 'graph-select',

  generate(difficulty: Difficulty, rng: Rng): Generated<ColoringState, ColorMove> {
    const { n, k, density } = configFor(difficulty);
    // Plant a proper coloring first, then only add edges between different colors.
    const planted = Array.from({ length: n }, () => rng.int(k));
    const edges: [number, number][] = [];
    const seen = new Set<string>();
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        if (planted[a] !== planted[b] && rng.next() < density) {
          const key = edgeKey(a, b);
          if (!seen.has(key)) {
            seen.add(key);
            edges.push([a, b]);
          }
        }
      }
    }
    // Guarantee at least one edge so a fully-colored board is never vacuously
    // "solved" (edges.every(...) is true on an empty edge set). The edge must
    // join two differently-colored nodes so the planted solution still holds;
    // if every node ended up the same color, recolor one (it has no edges yet).
    if (edges.length === 0 && n >= 2) {
      if (planted.every((c) => c === planted[0])) planted[1] = (planted[0] + 1) % k;
      const b = planted.findIndex((c) => c !== planted[0]);
      edges.push([0, b]);
    }
    // Pre-color every node with the first color as a starting scaffold.
    const puzzle: ColoringState = { n, edges, k, colors: Array(n).fill(0) };
    const solution: ColorMove[] = planted.map((color, node) => ({ node, color }));
    return { puzzle, solution };
  },

  applyMove(state, move) {
    const colors = [...state.colors];
    colors[move.node] = move.color;
    return { ...state, colors };
  },

  isSolved(state) {
    if (state.colors.some((c) => c === null)) return false;
    return state.edges.every(([a, b]) => state.colors[a] !== state.colors[b]);
  },

  progress(state) {
    // Fraction of edges whose endpoints differ. This stays 0 on a fresh board
    // (every node pre-colored the same => no satisfied edges) and reaches 100
    // exactly when solved — independent of isolated nodes.
    if (state.edges.length === 0) return 100;
    const satisfied = state.edges.filter(([a, b]) => state.colors[a] !== state.colors[b]).length;
    return Math.round((satisfied / state.edges.length) * 100);
  },
};
