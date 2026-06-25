import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

export interface MaxCutState {
  n: number;
  edges: [number, number][];
  colors: (number | null)[]; // 0 = side A (red), 1 = side B (teal)
  k: 2;
  cutTarget: number;
  instruction: string;
}
export interface MaxCutMove {
  node: number;
  color: number;
}

function configFor(d: Difficulty) {
  const n = Math.max(4, Math.round(4 + d / 250));
  const density = Math.min(0.7, 0.45 + d / 5000);
  return { n, density };
}

const norm = (a: number, b: number): [number, number] => (a < b ? [a, b] : [b, a]);

export const maxCut: PuzzleGame<MaxCutState, MaxCutMove> = {
  id: 'max-cut',
  name: 'Max Cut',
  archetype: 'graph-select',

  generate(difficulty: Difficulty, rng: Rng): Generated<MaxCutState, MaxCutMove> {
    const { n, density } = configFor(difficulty);

    // Plant a 2-coloring (partition)
    const planted = Array.from({ length: n }, () => rng.int(2));

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

    // Ensure at least some edges
    if (edges.length < 2) {
      edges.push(norm(0, 1));
      if (n > 2) edges.push(norm(1, 2));
    }

    // Count cut edges for the planted partition
    const cutEdges = edges.filter(([a, b]) => planted[a] !== planted[b]).length;
    // Allow a slightly relaxed target so alternative solutions also win
    const cutTarget = Math.max(1, cutEdges - 1);

    const puzzle: MaxCutState = {
      n,
      edges,
      colors: Array(n).fill(null),
      k: 2,
      cutTarget,
      instruction: `Assign nodes to two groups (red/teal) to cut at least ${cutTarget} edges between them`,
    };
    const solution: MaxCutMove[] = planted.map((color, node) => ({ node, color }));
    return { puzzle, solution };
  },

  applyMove(state, move) {
    const colors = [...state.colors];
    colors[move.node] = move.color;
    return { ...state, colors };
  },

  isSolved(state) {
    if (state.colors.some((c) => c === null)) return false;
    const cut = state.edges.filter(([a, b]) => state.colors[a] !== state.colors[b]).length;
    return cut >= state.cutTarget;
  },

  progress(state) {
    if (state.colors.some((c) => c === null)) return 0;
    const cut = state.edges.filter(([a, b]) => state.colors[a] !== state.colors[b]).length;
    return Math.round(Math.min(cut / state.cutTarget, 1) * 100);
  },
};
