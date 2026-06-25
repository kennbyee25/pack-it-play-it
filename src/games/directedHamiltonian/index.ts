import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';

// Directed Hamiltonian Circuit (graph-path archetype): find a directed cycle
// visiting every node exactly once. Edges are ordered pairs (a→b).
export interface DirectedHamiltonianState {
  n: number;
  edges: [number, number][]; // directed: [from, to]
  chosen: [number, number][]; // player's selected directed edges
  directed: true;
}
export interface DirectedHamiltonianMove {
  edge: [number, number];
}

const dkey = (e: [number, number]) => `${e[0]}->${e[1]}`;

function configFor(d: Difficulty) {
  const n = Math.max(5, Math.round(5 + d / 250));
  const extraEdges = Math.max(2, Math.round(2 + d / 300));
  return { n, extraEdges };
}

export const directedHamiltonian: PuzzleGame<DirectedHamiltonianState, DirectedHamiltonianMove> = {
  id: 'directed-hamiltonian',
  name: 'Directed Hamiltonian Circuit',
  archetype: 'graph-path',

  generate(difficulty: Difficulty, rng: Rng): Generated<DirectedHamiltonianState, DirectedHamiltonianMove> {
    const { n, extraEdges } = configFor(difficulty);
    const order = rng.shuffle(Array.from({ length: n }, (_, i) => i));

    const seen = new Set<string>();
    const edges: [number, number][] = [];

    const addEdge = (from: number, to: number) => {
      if (from !== to) {
        const k = dkey([from, to]);
        if (!seen.has(k)) {
          seen.add(k);
          edges.push([from, to]);
        }
      }
    };

    // Plant the directed cycle along the shuffled order.
    const cycle: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const from = order[i];
      const to = order[(i + 1) % n];
      cycle.push([from, to]);
      addEdge(from, to);
    }

    // Add decoy directed edges.
    let tries = 0;
    let added = 0;
    while (added < extraEdges && tries < extraEdges * 20) {
      tries++;
      const from = rng.int(n);
      const to = rng.int(n);
      if (from !== to && !seen.has(dkey([from, to]))) {
        addEdge(from, to);
        added++;
      }
    }

    const puzzle: DirectedHamiltonianState = {
      n,
      edges: rng.shuffle(edges),
      chosen: [],
      directed: true,
    };
    const solution: DirectedHamiltonianMove[] = cycle.map((edge) => ({ edge }));
    return { puzzle, solution };
  },

  applyMove(state, move) {
    const ek = dkey(move.edge);
    const exists = state.chosen.some((c) => dkey(c) === ek);
    return {
      ...state,
      chosen: exists
        ? state.chosen.filter((c) => dkey(c) !== ek)
        : [...state.chosen, move.edge],
    };
  },

  isSolved(state) {
    const { n, chosen, edges } = state;
    if (chosen.length !== n) return false;
    const available = new Set(edges.map(dkey));
    if (!chosen.every((e) => available.has(dkey(e)))) return false;
    // Every node must have in-degree 1 and out-degree 1.
    const inDeg = Array(n).fill(0);
    const outDeg = Array(n).fill(0);
    for (const [from, to] of chosen) {
      outDeg[from]++;
      inDeg[to]++;
    }
    if (!inDeg.every((d) => d === 1) || !outDeg.every((d) => d === 1)) return false;
    // Must be a single cycle: follow directed edges from node 0.
    const adj: Map<number, number> = new Map(chosen.map(([from, to]) => [from, to]));
    const visited = new Set<number>();
    let cur = 0;
    for (let step = 0; step < n; step++) {
      visited.add(cur);
      const next = adj.get(cur);
      if (next === undefined || visited.has(next)) break;
      cur = next;
    }
    return visited.size === n;
  },

  progress(state) {
    return Math.min(100, Math.round((state.chosen.length / state.n) * 100));
  },
};
