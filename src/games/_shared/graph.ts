// Shared graph primitives. Every graph game (coloring, clique, vertex cover,
// independent set, max cut, the Hamiltonian/Steiner family) reimplemented these
// edge helpers; this is the single source of truth.

export type Edge = [number, number];

// Canonical orientation for an undirected edge (smaller endpoint first), so the
// same pair always compares/keys equal regardless of click order.
export const normEdge = (a: number, b: number): Edge => (a < b ? [a, b] : [b, a]);

// Stable string keys for set membership.
export const edgeKey = (a: number, b: number): string => {
  const [x, y] = normEdge(a, b);
  return `${x}-${y}`;
};
export const edgeKeyOf = (e: Edge): string => edgeKey(e[0], e[1]);

// Accumulate a deduplicated undirected edge list — replaces the seen-Set +
// addEdge closure several generators hand-rolled.
export function edgeAccumulator() {
  const seen = new Set<string>();
  const edges: Edge[] = [];
  return {
    add(a: number, b: number): void {
      const k = edgeKey(a, b);
      if (seen.has(k)) return;
      seen.add(k);
      edges.push(normEdge(a, b));
    },
    has: (a: number, b: number): boolean => seen.has(edgeKey(a, b)),
    get edges(): Edge[] {
      return edges;
    },
  };
}
