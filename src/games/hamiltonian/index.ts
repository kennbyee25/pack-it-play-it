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
  description: 'Connect edges to form a single loop that visits every node exactly once.',
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
    const ek = key(e);
    // Toggle: clicking a chosen edge again removes it.
    const exists = state.chosen.some((c) => key(c) === ek);
    return {
      ...state,
      chosen: exists ? state.chosen.filter((c) => key(c) !== ek) : [...state.chosen, e],
    };
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

  countSolutions(puzzle: HamiltonianState, max: number): number {
    const { n, edges } = puzzle;
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
    let count = 0;

    // DFS: build a Hamiltonian path starting at node 0.
    // When path length = n and we can close back to 0: count++.
    // To avoid counting each undirected cycle twice (forward/backward),
    // enforce that the first step from 0 is smaller than the last node before closing.
    const visited = new Array(n).fill(false);
    const path: number[] = [0];
    visited[0] = true;

    function bt(): boolean {
      const cur = path[path.length - 1];
      if (path.length === n) {
        // Close the cycle: last node must be adjacent to 0.
        if (adj[cur].includes(0) && path[1] < cur) {
          count++;
          return count >= max;
        }
        return false;
      }
      for (const nb of adj[cur]) {
        if (!visited[nb]) {
          visited[nb] = true;
          path.push(nb);
          if (bt()) return true;
          path.pop();
          visited[nb] = false;
        }
      }
      return false;
    }

    bt();
    return count;
  },
};
