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
    const ok = await postRows(
      `${this.cfg.url}/rest/v1/${this.cfg.table}`,
      {
        apikey: this.cfg.anonKey,
        Authorization: `Bearer ${this.cfg.anonKey}`,
        Prefer: 'return=minimal',
      },
      batch,
      this.cfg.fetchImpl,
      this.cfg.maxRetries,
    );
    if (!ok) this.buffer = batch.concat(this.buffer); // requeue for a later flush
  }
}

// Map events to row shape { type, session_id, puzzle_id, ts, payload } and POST
// them with retry/backoff. Returns false if all attempts failed (caller requeues).
function toRows(batch: TraceEvent[]) {
  return batch.map((e) => ({
    type: e.type,
    session_id: e.sessionId,
    puzzle_id: e.puzzleId,
    ts: e.ts,
    payload: e,
  }));
}

async function postRows(
  endpoint: string,
  headers: Record<string, string>,
  batch: TraceEvent[],
  fetchImpl: typeof fetch,
  maxRetries: number,
): Promise<boolean> {
  const body = JSON.stringify(toRows(batch));
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body,
      });
      if (res.ok) return true;
    } catch {
      // network error — fall through to retry/backoff
    }
    if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
  }
  return false;
}

// Self-hosted ingest sink: POSTs the same rows to a plain `${url}/traces` endpoint
// (our Tailscale-Funnel'd ingest service). No auth headers — the server is
// insert-only and CORS-restricted to the Pages origin.
export interface HttpSinkConfigSelf {
  url: string;
  batchSize?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

export class HttpSink implements TraceSink {
  private buffer: TraceEvent[] = [];
  private readonly url: string;
  private readonly batchSize: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(cfg: HttpSinkConfigSelf) {
    this.url = cfg.url.replace(/\/$/, '');
    this.batchSize = cfg.batchSize ?? 20;
    this.maxRetries = cfg.maxRetries ?? 3;
    this.fetchImpl = cfg.fetchImpl ?? fetch.bind(globalThis);
  }

  emit(event: TraceEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= this.batchSize) void this.flush();
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer;
    this.buffer = [];
    const ok = await postRows(`${this.url}/traces`, {}, batch, this.fetchImpl, this.maxRetries);
    if (!ok) this.buffer = batch.concat(this.buffer);
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
// Precedence: self-hosted ingest (VITE_TRACE_URL) → Supabase → Noop.
export function makeSink(env: Record<string, string | undefined> = importMetaEnv()): TraceSink {
  if (env.VITE_TRACE_URL) return new HttpSink({ url: env.VITE_TRACE_URL });
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  if (url && anonKey) return new SupabaseSink({ url, anonKey });
  return NoopSink;
}

function importMetaEnv(): Record<string, string | undefined> {
  // import.meta.env is statically replaced by Vite; guard for non-Vite runtimes.
  try {
    return (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  } catch {
    return {};
  }
}
