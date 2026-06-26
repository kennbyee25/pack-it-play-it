import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import { normEdge as norm } from '../_shared/graph';

// Steiner Tree (graph-path archetype): connect all terminal nodes using a subset
// of available edges. Non-terminal (Steiner) nodes may be used as intermediate.
export interface SteinerTreeState {
  n: number;
  edges: [number, number][]; // undirected, a < b
  chosen: [number, number][]; // player's selected edges
  terminals: number[]; // required nodes that must all be connected
  directed: false;
}
export interface SteinerTreeMove {
  edge: [number, number];
}

const ekey = (e: [number, number]) => `${e[0]}-${e[1]}`;

function configFor(d: Difficulty) {
  const n = Math.max(5, Math.round(5 + d / 300));
  const terminalCount = Math.max(2, Math.round(2 + d / 700));
  const extraEdges = Math.max(2, Math.round(2 + d / 300));
  return { n, terminalCount: Math.min(terminalCount, n), extraEdges };
}

export const steinerTree: PuzzleGame<SteinerTreeState, SteinerTreeMove> = {
  id: 'steiner-tree',
  name: 'Steiner Tree',
  archetype: 'graph-path',

  generate(difficulty: Difficulty, rng: Rng): Generated<SteinerTreeState, SteinerTreeMove> {
    const { n, terminalCount, extraEdges } = configFor(difficulty);
    const allNodes = Array.from({ length: n }, (_, i) => i);
    const terminals = rng.shuffle(allNodes).slice(0, terminalCount);

    const seen = new Set<string>();
    const plantedEdges: [number, number][] = [];

    const addEdge = (a: number, b: number) => {
      const e = norm(a, b);
      const k = ekey(e);
      if (!seen.has(k)) {
        seen.add(k);
        plantedEdges.push(e);
      }
    };

    // Build a tree connecting all terminals via a chain, sometimes through Steiner nodes.
    const shuffledTerminals = rng.shuffle([...terminals]);
    const steinerNodes = allNodes.filter((nd) => !terminals.includes(nd));
    for (let i = 0; i < shuffledTerminals.length - 1; i++) {
      const from = shuffledTerminals[i];
      const to = shuffledTerminals[i + 1];
      if (steinerNodes.length > 0 && rng.next() < 0.5) {
        const mid = rng.pick(steinerNodes);
        addEdge(from, mid);
        addEdge(mid, to);
      } else {
        addEdge(from, to);
      }
    }

    const solution: SteinerTreeMove[] = plantedEdges.map((edge) => ({ edge }));

    // Add decoy edges.
    let tries = 0;
    let added = 0;
    while (added < extraEdges && tries < extraEdges * 20) {
      tries++;
      const a = rng.int(n);
      const b = rng.int(n);
      if (a !== b && !seen.has(ekey(norm(a, b)))) {
        addEdge(a, b);
        added++;
      }
    }

    const allEdges: [number, number][] = [];
    for (const k of seen) {
      const [a, b] = k.split('-').map(Number);
      allEdges.push([a, b]);
    }

    const puzzle: SteinerTreeState = {
      n,
      edges: rng.shuffle(allEdges),
      chosen: [],
      terminals,
      directed: false,
    };

    return { puzzle, solution };
  },

  applyMove(state, move) {
    const ek = ekey(norm(move.edge[0], move.edge[1]));
    const exists = state.chosen.some((c) => ekey(c) === ek);
    const normalizedEdge = norm(move.edge[0], move.edge[1]);
    return {
      ...state,
      chosen: exists
        ? state.chosen.filter((c) => ekey(c) !== ek)
        : [...state.chosen, normalizedEdge],
    };
  },

  isSolved(state) {
    if (state.terminals.length === 0) return true;
    if (state.chosen.length === 0) return false;
    const adj: Map<number, number[]> = new Map();
    for (const [a, b] of state.chosen) {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a)!.push(b);
      adj.get(b)!.push(a);
    }
    const visited = new Set<number>();
    const queue = [state.terminals[0]];
    visited.add(state.terminals[0]);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const nb of adj.get(cur) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    return state.terminals.every((t) => visited.has(t));
  },

  progress(state) {
    if (state.chosen.length === 0) return 0;
    const adj: Map<number, number[]> = new Map();
    for (const [a, b] of state.chosen) {
      if (!adj.has(a)) adj.set(a, []);
      if (!adj.has(b)) adj.set(b, []);
      adj.get(a)!.push(b);
      adj.get(b)!.push(a);
    }
    const visited = new Set<number>();
    const queue = [state.terminals[0]];
    visited.add(state.terminals[0]);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const nb of adj.get(cur) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    const reachable = state.terminals.filter((t) => visited.has(t)).length;
    return Math.round((reachable / state.terminals.length) * 100);
  },
};
