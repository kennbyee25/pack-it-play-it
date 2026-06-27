import { useState } from 'react';

const undirKey = (e: [number, number]) => `${Math.min(e[0], e[1])}-${Math.max(e[0], e[1])}`;
const dirKey = (e: [number, number]) => `${e[0]}->${e[1]}`;
const edgeOf = (a: number, b: number): [number, number] => (a < b ? [a, b] : [b, a]);

// graph-path archetype. Handles three modes:
//   undirected hamiltonian: build one cycle through every node (default)
//   directed hamiltonian:   state.directed === true — arrowhead edges
//   steiner tree:           state.terminals present — connect highlighted terminals
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PathBoard({ state, onMove }: { state: any; onMove: (m: any) => void }) {
  const size = 320;
  const r = size / 2 - 36;
  const cx = size / 2;
  const cy = size / 2;
  const pos = (i: number) => {
    const t = (i / state.n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
  };

  const isDirected: boolean = state.directed === true;
  const terminals: number[] = state.terminals ?? [];
  const terminalSet = new Set(terminals);

  const keyFn = isDirected ? dirKey : undirKey;
  const chosen = new Set(state.chosen.map(keyFn));
  const available = new Set(state.edges.map(keyFn));

  const [selected, setSelected] = useState<number | null>(null);

  const clickNode = (i: number) => {
    if (selected === null) {
      setSelected(i);
      return;
    }
    if (selected === i) {
      setSelected(null);
      return;
    }
    const e: [number, number] = isDirected ? [selected, i] : edgeOf(selected, i);
    if (available.has(keyFn(e))) onMove({ edge: e });
    // Keep the just-clicked node selected so edges can be chained in one click
    // each (A->B, then B->C…). Clicking the same node again (above) deselects.
    setSelected(i);
  };

  let instruction: string;
  if (isDirected) {
    instruction = `Click an edge — or two nodes — to toggle it. Form one directed cycle through all ${state.n} nodes.`;
  } else if (terminals.length > 0) {
    instruction = `Connect all highlighted terminal nodes (${terminals.length}) using the available edges.`;
  } else {
    instruction = `Click an edge — or two nodes — to toggle it. Form one loop through all ${state.n} nodes.`;
  }

  // Shorten line endpoints slightly so arrowheads don't overlap node circles.
  const nodeRadius = 16;
  const shorten = (pa: { x: number; y: number }, pb: { x: number; y: number }) => {
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y };
    const ux = dx / len;
    const uy = dy / len;
    return {
      x1: pa.x + ux * nodeRadius,
      y1: pa.y + uy * nodeRadius,
      x2: pb.x - ux * (nodeRadius + 8),
      y2: pb.y - uy * (nodeRadius + 8),
    };
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">{instruction}</p>
      <svg width={size} height={size} role="img" aria-label="path graph">
        {isDirected && (
          <defs>
            <marker id="arrow-on" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#2dd4bf" />
            </marker>
            <marker id="arrow-off" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
            </marker>
          </defs>
        )}
        {state.edges.map((e: [number, number], i: number) => {
          const pa = pos(e[0]);
          const pb = pos(e[1]);
          const on = chosen.has(keyFn(e));
          const coords = isDirected ? shorten(pa, pb) : { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y };
          return (
            <g
              key={`e${i}`}
              role="button"
              aria-label={`edge-${keyFn(e)}`}
              onClick={() => onMove({ edge: e })}
              style={{ cursor: 'pointer' }}
            >
              <line x1={coords.x1} y1={coords.y1} x2={coords.x2} y2={coords.y2} stroke="transparent" strokeWidth={18} />
              <line
                x1={coords.x1}
                y1={coords.y1}
                x2={coords.x2}
                y2={coords.y2}
                stroke={on ? '#2dd4bf' : '#cbd5e1'}
                strokeWidth={on ? 5 : 2}
                pointerEvents="none"
                markerEnd={isDirected ? (on ? 'url(#arrow-on)' : 'url(#arrow-off)') : undefined}
              />
            </g>
          );
        })}
        {Array.from({ length: state.n }).map((_, i) => {
          const p = pos(i);
          const isSel = selected === i;
          const isTerminal = terminalSet.has(i);
          const fill = isSel ? '#2dd4bf' : isTerminal ? '#fbbf24' : '#475569';
          const stroke = isSel ? '#0f766e' : isTerminal ? '#d97706' : 'white';
          return (
            <g
              key={`n${i}`}
              role="button"
              aria-label={`node-${i}`}
              style={{ cursor: 'pointer' }}
              onClick={() => clickNode(i)}
            >
              <circle cx={p.x} cy={p.y} r={nodeRadius} fill={fill} stroke={stroke} strokeWidth={isSel || isTerminal ? 3 : 2} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fill="white" fontSize={12} pointerEvents="none">
                {i}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
