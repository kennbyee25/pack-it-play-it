// Idle-resistant "active time" accounting for solve-time metrics.
// A player who walks away mid-puzzle (a 107-minute AFK was seen in the logs) would
// otherwise blow up solve-time, which feeds the optimal-challenge / skill signal.
// We accumulate the gap between successive actions, but clamp each gap to IDLE_CAP_MS
// so long idle stretches contribute at most that much "thinking time".

export const IDLE_CAP_MS = 30_000; // any inter-action gap counts as at most 30s

// Add one inter-action gap to the running active total (gap clamped to [0, cap]).
export const accrueActive = (prevMs: number, gapMs: number, capMs = IDLE_CAP_MS): number =>
  prevMs + Math.min(Math.max(gapMs, 0), capMs);
