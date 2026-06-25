import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

export interface CliqueState {
  n: number;
  edges: [number, number][];
  selected: boolean[];
  k: number;
  instruction: string;
}
export interface CliqueMove {
  node: number;
}

function configFor(d: Difficulty) {
  const k = Math.max(3, Math.round(3 + d / 1000));
  const n = k + Math.max(3, Math.round(3 + d / 300));
  const extraEdges = Math.max(2, Math.round(2 + d / 400));
  return { k, n, extraEdges };
}

const norm = (a: number, b: number): [number, number] => (a < b ? [a, b] : [b, a]);
const edgeKey = (a: number, b: number) => { const [x, y] = norm(a, b); return `${x}-${y}`; };

export const clique: PuzzleGame<CliqueState, CliqueMove> = {
  id: 'clique',
  name: 'Clique',
  archetype: 'graph-select',

  generate(difficulty: Difficulty, rng: Rng): Generated<CliqueState, CliqueMove> {
    const { k, n, extraEdges } = configFor(difficulty);
    const allNodes = rng.shuffle(Array.from({ length: n }, (_, i) => i));
    const cliqueNodes = new Set(allNodes.slice(0, k));

    const seen = new Set<string>();
    const edges: [number, number][] = [];
    const addEdge = (a: number, b: number) => {
      const key = edgeKey(a, b);
      if (!seen.has(key)) { seen.add(key); edges.push(norm(a, b)); }
    };

    // Plant the clique — all k*(k-1)/2 edges.
    const cliqueArr = [...cliqueNodes];
    for (let i = 0; i < cliqueArr.length; i++) {
      for (let j = i + 1; j < cliqueArr.length; j++) {
        addEdge(cliqueArr[i], cliqueArr[j]);
      }
    }

    // Add decoy edges between non-clique nodes (and between clique/non-clique).
    const nonClique = allNodes.slice(k);
    let added = 0;
    let tries = 0;
    while (added < extraEdges && tries < extraEdges * 30) {
      tries++;
      const a = rng.int(n);
      const b = rng.int(n);
      if (a !== b && !seen.has(edgeKey(a, b))) {
        // Avoid completing another k-clique by restricting edges among non-clique only when safe
        addEdge(a, b);
        added++;
      }
    }

    // Extra non-clique edges to ensure some decoy connectivity
    for (let i = 0; i < nonClique.length - 1 && added < extraEdges + nonClique.length; i++) {
      if (rng.next() < 0.4) addEdge(nonClique[i], nonClique[i + 1]);
    }

    const puzzle: CliqueState = {
      n,
      edges: rng.shuffle(edges),
      selected: Array(n).fill(false),
      k,
      instruction: `Select exactly ${k} nodes that are all connected to each other`,
    };
    const solution: CliqueMove[] = cliqueArr.map((node) => ({ node }));
    return { puzzle, solution };
  },

  applyMove(state, move) {
    const selected = [...state.selected];
    selected[move.node] = !selected[move.node];
    return { ...state, selected };
  },

  isSolved(state) {
    const sel = state.selected.map((s, i) => (s ? i : -1)).filter((i) => i >= 0);
    if (sel.length !== state.k) return false;
    const edgeSet = new Set(state.edges.map(([a, b]) => edgeKey(a, b)));
    for (let i = 0; i < sel.length; i++) {
      for (let j = i + 1; j < sel.length; j++) {
        if (!edgeSet.has(edgeKey(sel[i], sel[j]))) return false;
      }
    }
    return true;
  },

  progress(state) {
    if (this.isSolved(state)) return 100;
    const count = state.selected.filter(Boolean).length;
    return Math.min(99, Math.round((count / state.k) * 100));
  },
};
