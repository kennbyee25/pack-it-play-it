import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import { toggleSelected, selectionCount } from '../_shared/selection';
import { normEdge as norm } from '../_shared/graph';

export interface VertexCoverState {
  n: number;
  edges: [number, number][];
  selected: boolean[];
  k: number;
  instruction: string;
}
export interface VertexCoverMove {
  node: number;
}

function configFor(d: Difficulty) {
  const n = Math.max(5, Math.round(5 + d / 300));
  const density = 0.4;
  return { n, density };
}


export const vertexCover: PuzzleGame<VertexCoverState, VertexCoverMove> = {
  id: 'vertex-cover',
  name: 'Vertex Cover',
  archetype: 'graph-select',

  generate(difficulty: Difficulty, rng: Rng): Generated<VertexCoverState, VertexCoverMove> {
    const { n, density } = configFor(difficulty);

    // Build random graph
    const seen = new Set<string>();
    const edges: [number, number][] = [];
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        if (rng.next() < density) {
          const e = norm(a, b);
          seen.add(`${e[0]}-${e[1]}`);
          edges.push(e);
        }
      }
    }

    // Ensure the graph has at least some edges
    if (edges.length < 2) {
      edges.push(norm(0, 1));
      edges.push(norm(1, 2));
    }

    // Greedy vertex cover: repeatedly pick highest-degree node covering uncovered edges
    const uncovered = new Set(edges.map((_, i) => i));
    const coverSet = new Set<number>();
    while (uncovered.size > 0) {
      // Compute degree for each node among uncovered edges
      const deg = Array(n).fill(0);
      for (const idx of uncovered) {
        const [a, b] = edges[idx];
        deg[a]++;
        deg[b]++;
      }
      // Pick highest degree
      let best = 0;
      for (let i = 1; i < n; i++) if (deg[i] > deg[best]) best = i;
      coverSet.add(best);
      // Remove all edges covered by `best`
      for (const idx of [...uncovered]) {
        const [a, b] = edges[idx];
        if (a === best || b === best) uncovered.delete(idx);
      }
    }

    const k = coverSet.size;
    const coverArr = [...coverSet];

    const puzzle: VertexCoverState = {
      n,
      edges,
      selected: Array(n).fill(false),
      k,
      instruction: `Select ≤ ${k} nodes so every edge has at least one endpoint selected`,
    };
    const solution: VertexCoverMove[] = coverArr.map((node) => ({ node }));
    return { puzzle, solution };
  },

  applyMove: (state, move) => toggleSelected(state, move.node),

  isSolved(state) {
    if (selectionCount(state.selected) > state.k) return false;
    return state.edges.every(([a, b]) => state.selected[a] || state.selected[b]);
  },

  progress(state) {
    if (state.edges.length === 0) return 100;
    const covered = state.edges.filter(([a, b]) => state.selected[a] || state.selected[b]).length;
    return Math.round((covered / state.edges.length) * 100);
  },
};
