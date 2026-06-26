// Search-space definitions for every solvable game, built from a few generic
// factories. Most NP games here reduce to "enumerate subsets/assignments of an
// array and set one field", so we parameterize that rather than writing a
// near-duplicate solver per game (DRY + context economy).

import type { SolverSpec } from './types';
import { bitmasks, randomMask } from './enumerate';
import type { Rng } from '../rng';

/* eslint-disable @typescript-eslint/no-explicit-any */

// A boolean[] selection over an array whose length is read from the puzzle.
// Covers every "select a subset" game (graph-select, set-cover family, number-packing).
export function subsetSpec(lengthOf: (puzzle: any) => number, field = 'selected'): SolverSpec<any> {
  return {
    *enumerate(puzzle) {
      for (const mask of bitmasks(lengthOf(puzzle))) yield { ...puzzle, [field]: mask };
    },
    randomCandidate: (puzzle, rng) => ({ ...puzzle, [field]: randomMask(lengthOf(puzzle), rng) }),
  };
}

// A 1-indexed boolean assignment over numVars (slot 0 unused): 3-SAT, integer-programming.
export function assignmentSpec(field = 'assignment'): SolverSpec<any> {
  const toA = (mask: boolean[]) => [null, ...mask];
  return {
    *enumerate(puzzle) {
      for (const mask of bitmasks(puzzle.numVars)) yield { ...puzzle, [field]: toA(mask) };
    },
    randomCandidate: (puzzle, rng) => ({
      ...puzzle,
      [field]: toA(Array.from({ length: puzzle.numVars }, () => rng.next() < 0.5)),
    }),
  };
}

// A subset of available edges chosen into `chosen` (graph-path: hamiltonian, steiner…).
export function edgeSubsetSpec(edgesField = 'edges', chosenField = 'chosen'): SolverSpec<any> {
  const pick = (edges: any[], mask: boolean[]) => edges.filter((_, i) => mask[i]);
  return {
    *enumerate(puzzle) {
      const edges = puzzle[edgesField] as any[];
      for (const mask of bitmasks(edges.length)) yield { ...puzzle, [chosenField]: pick(edges, mask) };
    },
    randomCandidate: (puzzle, rng) => {
      const edges = puzzle[edgesField] as any[];
      return { ...puzzle, [chosenField]: pick(edges, randomMask(edges.length, rng)) };
    },
  };
}

// A 2-way partition: colors[node] ∈ {0,1} over n nodes (max-cut).
export function binaryColorSpec(field = 'colors'): SolverSpec<any> {
  const toColors = (mask: boolean[]) => mask.map((b) => (b ? 1 : 0));
  return {
    *enumerate(puzzle) {
      for (const mask of bitmasks(puzzle.n)) yield { ...puzzle, [field]: toColors(mask) };
    },
    randomCandidate: (puzzle, rng) => ({
      ...puzzle,
      [field]: toColors(Array.from({ length: puzzle.n }, () => rng.next() < 0.5)),
    }),
  };
}

const selectedLen = (p: any) => p.selected.length;
const nodes = (p: any) => p.n;

// The registry of search spaces. One entry per game (Open-Closed).
// Excluded by design:
//   graph-coloring — color-swap symmetry (no unique solution) + k^n enumeration;
//   nonogram       — 2^(rows*cols) is infeasible to brute-force.
export const SPECS: Record<string, SolverSpec<any>> = {
  // logic / IP assignment
  'three-sat': assignmentSpec(),
  'integer-programming': assignmentSpec(),
  // number-packing (subset of items)
  'subset-sum': subsetSpec(selectedLen),
  partition: subsetSpec(selectedLen),
  knapsack: subsetSpec(selectedLen),
  // set-cover family (subset of subsets)
  'set-cover': subsetSpec(selectedLen),
  'set-packing': subsetSpec(selectedLen),
  'exact-cover': subsetSpec(selectedLen),
  'hitting-set': subsetSpec(selectedLen),
  '3d-matching': subsetSpec(selectedLen),
  // graph-select (subset of nodes)
  clique: subsetSpec(selectedLen),
  'vertex-cover': subsetSpec(selectedLen),
  'independent-set': subsetSpec(selectedLen),
  'max-cut': binaryColorSpec(),
  // graph-path (subset of edges)
  hamiltonian: edgeSubsetSpec(),
  'directed-hamiltonian': edgeSubsetSpec(),
  'steiner-tree': edgeSubsetSpec(),
};

export type { Rng };
