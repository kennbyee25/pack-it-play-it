import type { PuzzleGame, Generated, Difficulty } from '../types';
import type { Rng } from '../rng';
import { toggleSelected, selectionCount } from '../_shared/selection';

// Feedback Vertex Set (graph-select archetype): select ≤ k nodes whose removal makes the graph acyclic.
export interface FeedbackVertexSetState {
  n: number; // number of nodes
  edges: [number, number][]; // undirected edges
  k: number; // budget = size of the planted feedback vertex set
  selected: boolean[];
  instruction?: string;
}
export interface FeedbackVertexSetMove {
  node: number;
}

function configFor(d: Difficulty) {
  const n = Math.max(4, Math.round(4 + d / 100)); // ~4..28 nodes
  const edgeDensity = Math.min(0.4, Math.max(0.15, 0.15 + d / 3000)); // ~0.15..0.4
  const fvsSize = Math.min(5, Math.max(1, Math.round(1 + d / 800))); // planted FVS size
  return { n, edgeDensity, fvsSize };
}

// Helper: check if a graph is acyclic (forest) using union-find
function isAcyclic(n: number, edges: [number, number][], removed: boolean[]): boolean {
  const parent = Array.from({ length: n }, (_, i) => i);
  
  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  
  function union(a: number, b: number): boolean {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return false; // would create cycle
    parent[rootB] = rootA;
    return true;
  }
  
  // Only consider edges where neither endpoint is removed
  for (const [u, v] of edges) {
    if (!removed[u] && !removed[v]) {
      if (!union(u, v)) return false; // cycle detected
    }
  }
  return true;
}

// Return true if the vertex v participates in any cycle in the current graph
function vertexInCycle(n: number, edges: [number, number][], removed: boolean[], v: number): boolean {
  // Temporarily remove v and see if its neighbors become disconnected in the remaining graph
  // If v is in a cycle, removing it should not increase the number of connected components
  // among its neighbors (they should still be reachable via other paths)
  const neighbors = new Set<number>();
  for (const [u, w] of edges) {
    if (!removed[u] && w === v) neighbors.add(u);
    if (!removed[w] && u === v) neighbors.add(w);
  }
  if (neighbors.size <= 1) return false; // 0 or 1 neighbor can't be in a cycle
  
  // Check if any two neighbors are still connected without going through v
  const neighborArray = Array.from(neighbors);
  const visited = new Set<number>();
  
  function dfs(from: number, target: number, blocked: number): boolean {
    if (from === target) return true;
    visited.add(from);
    for (const [a, b] of edges) {
      const next = (a === from && !removed[b] && b !== blocked) ? b :
                   (b === from && !removed[a] && a !== blocked) ? a : -1;
      if (next !== -1 && !visited.has(next)) {
        if (dfs(next, target, blocked)) return true;
      }
    }
    return false;
  }
  
  // For each pair of neighbors, check if they're connected without going through v
  for (let i = 0; i < neighborArray.length; i++) {
    for (let j = i + 1; j < neighborArray.length; j++) {
      visited.clear();
      if (dfs(neighborArray[i], neighborArray[j], v)) {
        return true; // Found a path avoiding v, so v is in a cycle
      }
    }
  }
  return false;
}

export const feedbackVertexSet: PuzzleGame<FeedbackVertexSetState, FeedbackVertexSetMove> = {
  id: 'feedback-vertex-set',
  name: 'Feedback Vertex Set',
  description: 'Select a small set of nodes so that removing them makes the graph acyclic (no cycles remain).',
  archetype: 'graph-select',

  generate(difficulty: Difficulty, rng: Rng): Generated<FeedbackVertexSetState, FeedbackVertexSetMove> {
    const { n, edgeDensity, fvsSize } = configFor(difficulty);
    
    // Generate random undirected graph
    const edges: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (rng.next() < edgeDensity) {
          edges.push([i, j]);
        }
      }
    }
    
    // Ensure we have enough edges to be interesting
    if (edges.length < n) {
      // Add a cycle through all nodes
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        if (!edges.some(([a, b]) => (a === i && b === next) || (a === next && b === i))) {
          edges.push([i, next]);
        }
      }
    }
    
    // Plant a feedback vertex set by selecting fvsSize nodes randomly
    const plantedNodes = rng.shuffle(Array.from({ length: n }, (_, i) => i)).slice(0, fvsSize);
    const isPlanted = Array(n).fill(false);
    for (const node of plantedNodes) {
      isPlanted[node] = true;
    }
    
    // Verify it's actually a feedback vertex set; if not, add more nodes
    let needsMore = true;
    while (needsMore) {
      needsMore = !isAcyclic(n, edges, isPlanted);
      if (needsMore) {
        // Find a node that participates in a cycle and add it to the set
        const candidates = Array.from({ length: n }, (_, i) => i).filter(i => !isPlanted[i] && vertexInCycle(n, edges, isPlanted, i));
        if (candidates.length === 0) {
          // Fallback: add any unselected node
          const fallback = Array.from({ length: n }, (_, i) => i).filter(i => !isPlanted[i]);
          if (fallback.length === 0) break;
          const nodeToAdd = rng.pick(fallback);
          isPlanted[nodeToAdd] = true;
        } else {
          const nodeToAdd = rng.pick(candidates);
          isPlanted[nodeToAdd] = true;
        }
      }
    }
    
    const solution: FeedbackVertexSetMove[] = isPlanted
      .map((selected, index) => selected ? { node: index } : null)
      .filter((move): move is FeedbackVertexSetMove => move !== null);

    const puzzle: FeedbackVertexSetState = {
      n,
      edges,
      k: solution.length,
      selected: Array(n).fill(false),
      instruction: `Select ≤ ${solution.length} nodes so that removing them eliminates all cycles`,
    };
    return { puzzle, solution };
  },

  applyMove: (state, move) => toggleSelected(state, move.node),

  isSolved(state) {
    const selectedCount = selectionCount(state.selected);
    if (selectedCount > state.k) return false;
    return isAcyclic(state.n, state.edges, state.selected);
  },

  progress(state) {
    if (state.n === 0) return 0; // empty graph, nothing to do
    if (selectionCount(state.selected) > state.k) return 0; // over budget - penalize
    
    // If current selection already breaks all cycles, progress based on usage of budget
    if (isAcyclic(state.n, state.edges, state.selected)) {
      const used = selectionCount(state.selected);
      return state.k === 0 ? (used === 0 ? 100 : 0) : Math.round((used / state.k) * 100);
    }
    
    // Count how many vertices participate in cycles in the current graph
    const cyclicVertices = Array.from({ length: state.n }, (_, v) => v)
      .filter(v => vertexInCycle(state.n, state.edges, state.selected, v));
    
    if (cyclicVertices.length === 0) {
      // No cyclic vertices but isAcyclic returned false? shouldn't happen
      return 50;
    }
    
    // How many of those cyclic vertices have we selected?
    const selectedCyclic = cyclicVertices.filter(v => state.selected[v]).length;
    
    // Progress = fraction of cyclic vertices we've selected
    return Math.round((selectedCyclic / cyclicVertices.length) * 100);
  },
};