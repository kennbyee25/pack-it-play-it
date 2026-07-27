// OpenTelemetry browser instrumentation for pack-it-play-it
// Provides:
//   1. A WebTracerProvider that exports spans to an OTLP collector.
//   2. A structured JSON logger (`createLogger`) whose output includes trace/span IDs
//      when called inside an active OTel span.
//
// Usage
// ------
//   import { initTelemetry, logger } from './instrumentation/otel';
//   initTelemetry();               // once at app start
//   logger.info('puzzle served', { gameId, difficulty });
//   trace.getTracer('...').startSpan('solve');  // manual spans

import { context, trace, type Tracer } from '@opentelemetry/api';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

// ---- lazy initialisation ---------------------------------------------------

let initialized = false;

/** Call once at app entry to enable OTel tracing and web auto-instrumentation. */
export function initTelemetry(): void {
  if (initialized) return;
  initialized = true;

  const otlpEndpoint =
    (typeof process !== 'undefined' && process.env?.OTEL_EXPORTER_OTLP_ENDPOINT) ||
    'http://192.168.1.157:4317';

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'pack-it-play-it',
    }),
    spanProcessors: [
      new SimpleSpanProcessor(
        new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
      ),
    ],
  });

  provider.register();

  registerInstrumentations({
    instrumentations: [getWebAutoInstrumentations()],
  });
}

// ---- structured logger (JSON + trace context) ------------------------------

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface StructuredLog {
  ts: string;
  level: LogLevel;
  msg: string;
  traceId?: string;
  spanId?: string;
  meta?: Record<string, unknown>;
}

function iso(): string {
  try { return new Date().toISOString(); } catch { return ''; }
}

function buildLog(level: LogLevel, msg: string, meta?: Record<string, unknown>): StructuredLog {
  const log: StructuredLog = { ts: iso(), level, msg };
  const ctx = context.active();
  const spanCtx = trace.getSpanContext(ctx);
  if (spanCtx) {
    log.traceId = spanCtx.traceId;
    log.spanId = spanCtx.spanId;
  }
  if (meta && Object.keys(meta).length > 0) log.meta = meta;
  return log;
}

function write(entry: StructuredLog): void {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case 'error': console.error(line); break;
    case 'warn':  console.warn(line);  break;
    case 'debug': console.debug(line); break;
    default:      console.log(line);   break;
  }
}

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
}

export const logger: Logger = {
  info:  (msg, meta) => write(buildLog('info', msg, meta)),
  warn:  (msg, meta) => write(buildLog('warn', msg, meta)),
  error: (msg, meta) => write(buildLog('error', msg, meta)),
  debug: (msg, meta) => write(buildLog('debug', msg, meta)),
};
