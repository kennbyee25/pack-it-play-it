import { useState } from 'react';
import type { HamiltonianState, HamiltonianMove } from '../hamiltonian';
import type { BoardProps } from './types';

const key = (e: [number, number]) => `${Math.min(e[0], e[1])}-${Math.max(e[0], e[1])}`;
const edgeOf = (a: number, b: number): [number, number] => (a < b ? [a, b] : [b, a]);

// graph-path archetype. Build one cycle through every node by toggling edges —
// either click an edge directly, or click two endpoints in turn.
export function PathBoard({ state, onMove }: BoardProps<HamiltonianState, HamiltonianMove>) {
  const size = 320;
  const r = size / 2 - 36;
  const cx = size / 2;
  const cy = size / 2;
  const pos = (i: number) => {
    const t = (i / state.n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
  };
  const chosen = new Set(state.chosen.map(key));
  const available = new Set(state.edges.map(key));

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
    const e = edgeOf(selected, i);
    if (available.has(key(e))) onMove({ edge: e }); // toggle if a real edge connects them
    setSelected(i); // keep the second node selected as the new "from" node
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">
        Click an edge — or two nodes — to toggle it. Form one loop through all {state.n} nodes.
      </p>
      <svg width={size} height={size} role="img" aria-label="hamiltonian graph">
        {state.edges.map((e, i) => {
          const pa = pos(e[0]);
          const pb = pos(e[1]);
          const on = chosen.has(key(e));
          return (
            <g key={`e${i}`} role="button" aria-label={`edge-${key(e)}`} onClick={() => onMove({ edge: e })} style={{ cursor: 'pointer' }}>
              {/* Wide transparent hit area so thin edges are easy to click. */}
              <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="transparent" strokeWidth={18} />
              <line
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke={on ? '#2dd4bf' : '#cbd5e1'}
                strokeWidth={on ? 5 : 2}
                pointerEvents="none"
              />
            </g>
          );
        })}
        {Array.from({ length: state.n }).map((_, i) => {
          const p = pos(i);
          const isSel = selected === i;
          return (
            <g
              key={`n${i}`}
              role="button"
              aria-label={`node-${i}`}
              style={{ cursor: 'pointer' }}
              onClick={() => clickNode(i)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={16}
                fill={isSel ? '#2dd4bf' : '#475569'}
                stroke={isSel ? '#0f766e' : 'white'}
                strokeWidth={isSel ? 3 : 2}
              />
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
