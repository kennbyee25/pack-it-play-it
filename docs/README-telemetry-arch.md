# Telemetry Architecture — Behavioral Signals & OpenTelemetry

## Overview

The telemetry layer (MVP 5) captures both **performance** (moves, timing, outcomes) and **behavioral** (idle, error bursts, hesitation, abandon) signals from puzzle play. Events flow through a pipeline of interfaces and patterns designed for testability, privacy, and multi‑sink routing.

## Pipeline

```
GamePlayer / EndlessMode
    │
    ▼
Tracer (observer – src/telemetry/tracer.ts)
    │  emit(TraceEvent)
    ▼
GuardedSink (decorator – src/telemetry/sink.ts)
    │  opt‑out / idle‑cap / post‑solve lock
    ▼
Sinks (strategy)
    ├── SupabaseSink   → POST to Supabase REST API
    ├── HttpSink       → POST to self‑hosted ingest
    ├── OTELSink       → OTel span per event
    └── NoopSink       → dev / tests
```

## Core Interfaces (`src/telemetry/types.ts`)

```typescript
type TraceEvent =
  | PuzzleStarted   // { gameId, difficulty, genSeed, optimalMoves }
  | MoveEvent       // { moveIndex, move, msSinceStart }
  | PuzzleEnded     // { outcome, moves, seconds, score }
  | IdleEvent       // { durationMs }
  | ErrorBurstEvent // { count, moveType: 'illegal'|'wasted' }
  | AbandonEvent    // { secondsPlayed }
  | HesitationEvent // { gapMs, moveIndex }

interface TraceSink {
  emit(event: TraceEvent): void;
  flush(): Promise<void>;
}
```

## Design Patterns

| Pattern | Where | Why |
|---|---|---|
| **Observer** | `Tracer` holds a `TraceSink` reference; every call to `puzzleStarted` / `move` / `puzzleEnded` / `idle` / `errorBurst` / `abandon` / `hesitation` pushes events downstream. | Decouples game logic from telemetry routing. |
| **Strategy** | `TraceSink` interface with separate implementations for Supabase, HTTP, OTel, and no‑op. | Runtime selection via `makeSink()` and environment variables. |
| **Decorator** | `GuardedSink` wraps any `TraceSink` to enforce opt‑out, idle‑cap, and post‑solve move lock. | Cross‑cutting concerns applied without modifying sinks. |
| **Factory** | `makeSink(env)` returns the appropriate sink based on Vite env vars. | Centralises configuration logic. |

## Behavioral Signal Detection

| Signal | Trigger | Constants (`src/telemetry/sink.ts`) |
|---|---|---|
| `idle` | No move for `IDLE_THRESHOLD_MS` (30 s) | `IDLE_THRESHOLD_MS = 30_000` |
| `error_burst` | ≥`ERROR_BURST_THRESHOLD` (3) consecutive illegal / wasted moves | `ERROR_BURST_THRESHOLD = 3` |
| `abandon` | Player exits before solving, or idle exceeds `IDLE_CAP_SECONDS` (300 s) | `IDLE_CAP_SECONDS = 300` |
| `hesitation` | Inter‑move gap > heuristic threshold (10 s) | hard‑coded threshold in tracer call site |

## OpenTelemetry Integration (`src/instrumentation/otel.ts`)

- `initTelemetry()` — call once at app start; sets up `WebTracerProvider` + OTLP exporter.
- `logger` — structured JSON logger that injects `traceId` / `spanId` from the active OTel context.
- `OTELSink` — wraps every `TraceEvent` as a named OTel span (`telemetry.puzzle_started`, `telemetry.move`, …) with typed attributes.

## Prometheus Metrics (`src/api/metrics.ts`)

The `/api/metrics` endpoint exposes counters labelled by game and outcome:

- `puzzle_started_total{game="…"}`
- `puzzle_ended_total{game="…",outcome="solved|failed|abandoned"}`
- `behavioral_event_total{type="idle|error_burst|abandon|hesitation"}`
- `game_load_total`

## Grafana Dashboard (`docs/grafana/dashboard.json`)

Pre‑built dashboard with panels for puzzle load rate, solve rate by outcome, behavioral events, and game load count. Import into any Grafana instance scraping the `/api/metrics` endpoint.

## Test Strategy

| Layer | File | What it covers |
|---|---|---|
| Unit – types | `telemetry.test.ts` | Each `TraceEvent` variant emits correct shape; no PII leaks |
| Unit – tracer | `telemetry.test.ts` | Ordered stream; behavioral methods; no‑op when no active puzzle |
| Unit – sinks | `telemetry.test.ts` | Supabase batching + retry; HTTP sink auth omission; `NoopSink` inertness |
| Unit – GuardedSink | `telemetry.test.ts` | Post‑solve lock; opt‑out suppression |
| Unit – OTELSink | `telemetry.test.ts` | OTELSink construction and emit contract |
| Integration | CI smoke | Real Supabase round‑trip (requires secrets) |
| E2E | Playwright | Full puzzle play → verify trace events reach mocked endpoint |
