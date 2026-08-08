import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import { toggleSelected, selectionCount } from '../_shared/selection';

// Dominating Set (graph-select archetype): select ≤ k nodes so every node is
// either in the set or adjacent to a node in the set.
export interface DominatingSetState {
  n: number;
  edges: [number, number][];
  k: number; // budget = size of the planted dominating set
  selected: boolean[];
  instruction?: string;
}
export interface DominatingSetMove {
  node: number;
}

function configFor(d: Difficulty) {
  const n = Math.max(4, Math.round(4 + d / 150)); // ~4..20 nodes
  const edgeProb = Math.min(0.4, Math.max(0.15, 0.15 + d / 4000)); // ~0.15..0.4
  const k = Math.min(5, Math.max(1, Math.round(1 + d / 800))); // planted set size
  return { n, edgeProb, k };
}

// Build the graph (with a spanning cycle so it's connected), then greedily
// extend a random seed into a dominating set — the planted solution.
function buildGraph(n: number, edgeProb: number, rng: Rng) {
  const edges: [number, number][] = [];
  // Random edges.
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (rng.next() < edgeProb) edges.push([i, j]);
    }
  }
  // Spanning cycle guarantees connectivity (every node has a neighbor).
  for (let i = 0; i < n; i++) {
    const a = i;
    const b = (i + 1) % n;
    if (!edges.some(([u, v]) => (u === a && v === b) || (u === b && v === a))) edges.push([a, b]);
  }
  return edges;
}

const adjacencyOf = (n: number, edges: [number, number][]) => {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [u, v] of edges) {
    adj[u].push(v);
    adj[v].push(u);
  }
  return adj;
};

// A node is dominated if it is selected or adjacent to a selected node.
function dominates(n: number, adj: number[][], selected: boolean[]): boolean {
  for (let v = 0; v < n; v++) {
    if (selected[v]) continue;
    if (!adj[v].some((u) => selected[u])) return false;
  }
  return true;
}

export const dominatingSet: PuzzleGame<DominatingSetState, DominatingSetMove> = {
  id: 'dominating-set',
  name: 'Dominating Set',
  description: 'Select a small set of nodes so that every node is selected or adjacent to a selected node.',
  archetype: 'graph-select',

  generate(difficulty: Difficulty, rng: Rng): Generated<DominatingSetState, DominatingSetMove> {
    const { n, edgeProb, k: targetK } = configFor(difficulty);
    const edges = buildGraph(n, edgeProb, rng);
    const adj = adjacencyOf(n, edges);

    // Seed with random nodes, then greedily absorb undominated nodes until the
    // whole graph is dominated. The result is a valid dominating set (and, when
    // the seed is lucky, exactly targetK or smaller).
    const selected = Array(n).fill(false);
    const seedCount = Math.min(targetK, Math.max(1, Math.floor(n / 3)));
    const shuffled = rng.shuffle(Array.from({ length: n }, (_, i) => i));
    for (let i = 0; i < seedCount; i++) selected[shuffled[i]] = true;

    while (!dominates(n, adj, selected)) {
      // Pick an undominated node and select it.
      const undominated = Array.from({ length: n }, (_, v) => v).find((v) => {
        if (selected[v]) return false;
        return !adj[v].some((u) => selected[u]);
      });
      if (undominated === undefined) break; // already dominated
      selected[undominated] = true;
    }

    const solution: DominatingSetMove[] = selected
      .map((on, i) => (on ? { node: i } : null))
      .filter((m): m is DominatingSetMove => m !== null);

    const puzzle: DominatingSetState = {
      n,
      edges,
      k: solution.length,
      selected: Array(n).fill(false),
      instruction: `Select ≤ ${solution.length} nodes so every node is selected or adjacent to a selected node`,
    };
    return { puzzle, solution };
  },

  applyMove: (state, move) => toggleSelected(state, move.node),

  isSolved(state) {
    const count = selectionCount(state.selected);
    if (count > state.k) return false;
    return dominates(state.n, adjacencyOf(state.n, state.edges), state.selected);
  },

  progress(state) {
    if (state.n === 0) return 0;
    if (selectionCount(state.selected) > state.k) return 0; // over budget
    const adj = adjacencyOf(state.n, state.edges);
    let dominated = 0;
    for (let v = 0; v < state.n; v++) {
      if (state.selected[v] || adj[v].some((u) => state.selected[u])) dominated++;
    }
    return Math.round((dominated / state.n) * 100);
  },
};