// Transport-agnostic trace sink. The default implementation batches events and
// POSTs them to a Supabase Postgres table via its REST endpoint (no extra deps —
// plain fetch). When unconfigured (dev/tests/Pages without secrets) or when the
// user opts out, a NoopSink is used so the app always runs.

import type { TraceEvent } from './types';

export interface TraceSink {
  emit(event: TraceEvent): void;
  flush(): Promise<void>;
}

export const NoopSink: TraceSink = {
  emit() {},
  async flush() {},
};

export interface HttpSinkConfig {
  url: string; // Supabase project URL
  anonKey: string; // publishable anon key (RLS insert-only protects the table)
  table?: string; // default 'traces'
  batchSize?: number; // flush when buffer reaches this
  fetchImpl?: typeof fetch; // injectable for tests
  maxRetries?: number;
}

export class SupabaseSink implements TraceSink {
  private buffer: TraceEvent[] = [];
  private readonly cfg: Required<Omit<HttpSinkConfig, 'fetchImpl'>> & { fetchImpl: typeof fetch };

  constructor(config: HttpSinkConfig) {
    this.cfg = {
      url: config.url.replace(/\/$/, ''),
      anonKey: config.anonKey,
      table: config.table ?? 'traces',
      batchSize: config.batchSize ?? 20,
      maxRetries: config.maxRetries ?? 3,
      fetchImpl: config.fetchImpl ?? fetch.bind(globalThis),
    };
  }

  emit(event: TraceEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= this.cfg.batchSize) void this.flush();
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer;
    this.buffer = [];
    const endpoint = `${this.cfg.url}/rest/v1/${this.cfg.table}`;
    // Store each event as a row: { type, session_id, puzzle_id, ts, payload }.
    const rows = batch.map((e) => ({
      type: e.type,
      session_id: e.sessionId,
      puzzle_id: e.puzzleId,
      ts: e.ts,
      payload: e,
    }));

    for (let attempt = 0; attempt <= this.cfg.maxRetries; attempt++) {
      try {
        const res = await this.cfg.fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.cfg.anonKey,
            Authorization: `Bearer ${this.cfg.anonKey}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(rows),
        });
        if (res.ok) return;
      } catch {
        // network error — fall through to retry/backoff
      }
      if (attempt < this.cfg.maxRetries) {
        await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
      }
    }
    // Give up: requeue so a later flush can retry (crash-safety left to caller).
    this.buffer = batch.concat(this.buffer);
  }
}

// ---- factory ---------------------------------------------------------------

const ANON_KEY = 'pip.anonId';
const OPTOUT_KEY = 'pip.telemetry'; // 'off' disables collection

export function getAnonId(storage: Storage | undefined = safeStorage()): string {
  if (!storage) return 'anon';
  let id = storage.getItem(ANON_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `anon-${Date.now()}`;
    storage.setItem(ANON_KEY, id);
  }
  return id;
}

export const isOptedOut = (storage: Storage | undefined = safeStorage()): boolean =>
  storage?.getItem(OPTOUT_KEY) === 'off';

export function setOptOut(off: boolean, storage: Storage | undefined = safeStorage()): void {
  if (!storage) return;
  if (off) storage.setItem(OPTOUT_KEY, 'off');
  else storage.removeItem(OPTOUT_KEY);
}

// Wrap a sink so emit() is suppressed live whenever the user is opted out — lets a
// runtime toggle take effect without a reload.
export function guardedSink(inner: TraceSink): TraceSink {
  return {
    emit: (e) => {
      if (!isOptedOut()) inner.emit(e);
    },
    flush: () => inner.flush(),
  };
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

// Pick the sink from Vite env. On by default; NoopSink when unconfigured. The
// opt-out is applied live via guardedSink (see tracer), so toggling needs no reload.
export function makeSink(env: Record<string, string | undefined> = importMetaEnv()): TraceSink {
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NoopSink;
  return new SupabaseSink({ url, anonKey });
}

function importMetaEnv(): Record<string, string | undefined> {
  // import.meta.env is statically replaced by Vite; guard for non-Vite runtimes.
  try {
    return (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  } catch {
    return {};
  }
}
