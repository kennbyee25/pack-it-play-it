import type { ColoringState, ColorMove } from '../graphColoring';
import type { BoardProps } from './types';

// Explicit hex fills (SVG can't use Tailwind bg-* utilities).
const FILLS = ['#f87171', '#2dd4bf', '#fbbf24', '#a78bfa', '#38bdf8', '#fb7185'];

// graph-select archetype. Nodes laid on a circle; click a node to cycle its color.
export function GraphBoard({ state, onMove }: BoardProps<ColoringState, ColorMove>) {
  const size = 320;
  const r = size / 2 - 36;
  const cx = size / 2;
  const cy = size / 2;
  const pos = (i: number) => {
    const t = (i / state.n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) };
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">
        Click a node to cycle its color · use ≤ {state.k} colors, no two linked nodes alike
      </p>
      <svg width={size} height={size} role="img" aria-label="coloring graph">
        {state.edges.map(([a, b], i) => {
          const pa = pos(a);
          const pb = pos(b);
          return (
            <line key={`e${i}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#94a3b8" strokeWidth={2} />
          );
        })}
        {Array.from({ length: state.n }).map((_, i) => {
          const p = pos(i);
          const c = state.colors[i];
          return (
            <g
              key={`n${i}`}
              role="button"
              aria-label={`node-${i}`}
              style={{ cursor: 'pointer' }}
              onClick={() => onMove({ node: i, color: c === null ? 0 : (c + 1) % state.k })}
            >
              <circle cx={p.x} cy={p.y} r={18} fill={c === null ? '#475569' : FILLS[c % FILLS.length]} stroke="white" strokeWidth={2} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fill="white" fontSize={12}>{i}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
