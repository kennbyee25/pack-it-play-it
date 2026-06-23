import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

// Undirected Hamiltonian Circuit (graph-path archetype): pick edges forming one
// cycle that visits every node exactly once.
export interface HamiltonianState {
  n: number;
  edges: [number, number][]; // available edges, a < b
  chosen: [number, number][]; // player's selected edges
}
export interface HamiltonianMove {
  edge: [number, number];
}

const norm = (a: number, b: number): [number, number] => (a < b ? [a, b] : [b, a]);
const key = (e: [number, number]) => `${e[0]}-${e[1]}`;

function configFor(d: Difficulty) {
  const n = Math.max(5, Math.round(5 + d / 250)); // ~5..15
  const extraEdges = Math.max(2, Math.round(2 + d / 300));
  return { n, extraEdges };
}

export const hamiltonian: PuzzleGame<HamiltonianState, HamiltonianMove> = {
  id: 'hamiltonian',
  name: 'Hamiltonian Circuit',
  archetype: 'graph-path',

  generate(difficulty: Difficulty, rng: Rng): Generated<HamiltonianState, HamiltonianMove> {
    const { n, extraEdges } = configFor(difficulty);
    const order = rng.shuffle(Array.from({ length: n }, (_, i) => i));

    const seen = new Set<string>();
    const edges: [number, number][] = [];
    const add = (a: number, b: number) => {
      const e = norm(a, b);
      if (a !== b && !seen.has(key(e))) {
        seen.add(key(e));
        edges.push(e);
      }
    };

    // Plant the cycle along the shuffled order.
    const cycle: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const e = norm(order[i], order[(i + 1) % n]);
      cycle.push(e);
      add(e[0], e[1]);
    }
    // Add decoy edges.
    let tries = 0;
    let added = 0;
    while (added < extraEdges && tries < extraEdges * 20) {
      tries++;
      const a = rng.int(n);
      const b = rng.int(n);
      if (a !== b && !seen.has(key(norm(a, b)))) {
        add(a, b);
        added++;
      }
    }

    const puzzle: HamiltonianState = { n, edges: rng.shuffle(edges), chosen: [] };
    const solution: HamiltonianMove[] = cycle.map((edge) => ({ edge }));
    return { puzzle, solution };
  },

  applyMove(state, move) {
    const e = norm(move.edge[0], move.edge[1]);
    if (state.chosen.some((c) => key(c) === key(e))) return state;
    return { ...state, chosen: [...state.chosen, e] };
  },

  isSolved(state) {
    const { n, chosen, edges } = state;
    if (chosen.length !== n) return false;
    const available = new Set(edges.map(key));
    if (!chosen.every((e) => available.has(key(e)))) return false;
    // Every node must have degree exactly 2.
    const deg = Array(n).fill(0);
    for (const [a, b] of chosen) {
      deg[a]++;
      deg[b]++;
    }
    if (!deg.every((d) => d === 2)) return false;
    // The chosen edges must form a single connected cycle (not disjoint loops).
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (const [a, b] of chosen) {
      adj[a].push(b);
      adj[b].push(a);
    }
    const visited = new Set<number>();
    let cur = 0;
    let prev = -1;
    for (let step = 0; step < n; step++) {
      visited.add(cur);
      const nextNode = adj[cur].find((nb) => nb !== prev && !visited.has(nb));
      const fallback = adj[cur].find((nb) => nb !== prev);
      const move = nextNode ?? fallback ?? -1;
      if (move === -1) break;
      prev = cur;
      cur = move;
    }
    return visited.size === n;
  },

  progress(state) {
    return Math.min(100, Math.round((state.chosen.length / state.n) * 100));
  },
};
