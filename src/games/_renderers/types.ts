export interface BoardProps<TState, TMove> {
  state: TState;
  onMove: (move: TMove) => void;
}

// Tailwind classes used to visualize color/category indices across renderers.
export const PALETTE = [
  'bg-piece-coral',
  'bg-piece-teal',
  'bg-piece-amber',
  'bg-piece-violet',
  'bg-piece-sky',
  'bg-piece-rose',
];
