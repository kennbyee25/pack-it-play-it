import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

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

const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

function configFor(d: Difficulty) {
  const n = Math.max(4, Math.round(4 + d / 250)); // ~4..14 nodes
  const k = Math.min(4, Math.max(2, Math.round(2 + d / 800)));
  const density = 0.35 + Math.min(0.35, d / 4000); // edge probability
  return { n, k, density };
}

export const graphColoring: PuzzleGame<ColoringState, ColorMove> = {
  id: 'graph-coloring',
  name: 'Graph Coloring',
  description: 'Color each node so that no two directly connected nodes share the same color.',
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
    const puzzle: ColoringState = { n, edges, k, colors: Array(n).fill(null) };
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

  countSolutions(puzzle: ColoringState, max: number): number {
    const { n, k, edges } = puzzle;
    const adj: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));
    for (const [a, b] of edges) { adj[a][b] = true; adj[b][a] = true; }
    const colors = new Array<number>(n).fill(-1);
    let count = 0;

    // Symmetry breaking: colors must be introduced in ascending order.
    // i.e. color c is only ever assigned if c-1 has already been used.
    // This canonicalizes away label permutations.
    function bt(node: number, maxColorUsed: number): boolean {
      if (node === n) {
        count++;
        return count >= max;
      }
      const colorLimit = Math.min(k - 1, maxColorUsed + 1);
      for (let c = 0; c <= colorLimit; c++) {
        let ok = true;
        for (let j = 0; j < node; j++) {
          if (adj[node][j] && colors[j] === c) { ok = false; break; }
        }
        if (!ok) continue;
        colors[node] = c;
        if (bt(node + 1, Math.max(maxColorUsed, c))) return true;
        colors[node] = -1;
      }
      return false;
    }

    bt(0, -1);
    return count;
  },

  progress(state) {
    // Nodes that are colored and not part of any monochromatic edge.
    const bad = new Set<number>();
    for (const [a, b] of state.edges) {
      if (state.colors[a] !== null && state.colors[a] === state.colors[b]) {
        bad.add(a);
        bad.add(b);
      }
    }
    const good = state.colors.filter((c, i) => c !== null && !bad.has(i)).length;
    return Math.round((good / state.n) * 100);
  },
};
