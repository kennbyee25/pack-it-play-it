import type { HamiltonianState, HamiltonianMove } from '../hamiltonian';
import type { BoardProps } from './types';

const key = (e: [number, number]) => `${Math.min(e[0], e[1])}-${Math.max(e[0], e[1])}`;

// graph-path archetype. Click an edge to add it to the circuit; build one cycle
// visiting every node exactly once.
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

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">
        Click edges to form one loop through all {state.n} nodes
      </p>
      <svg width={size} height={size} role="img" aria-label="hamiltonian graph">
        {state.edges.map((e, i) => {
          const pa = pos(e[0]);
          const pb = pos(e[1]);
          const on = chosen.has(key(e));
          return (
            <line
              key={`e${i}`}
              role="button"
              aria-label={`edge-${key(e)}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={on ? '#2dd4bf' : '#cbd5e1'}
              strokeWidth={on ? 4 : 2}
              style={{ cursor: 'pointer' }}
              onClick={() => onMove({ edge: e })}
            />
          );
        })}
        {Array.from({ length: state.n }).map((_, i) => {
          const p = pos(i);
          return (
            <g key={`n${i}`}>
              <circle cx={p.x} cy={p.y} r={16} fill="#475569" stroke="white" strokeWidth={2} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fill="white" fontSize={12}>{i}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
