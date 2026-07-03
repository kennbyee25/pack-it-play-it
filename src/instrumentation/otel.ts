// OpenTelemetry instrumentation for Vite/React app
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { SimpleSpanProcessor, SpanProcessor, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { SpanExporter } from '@opentelemetry';

// Configure OTLP exporter for traces
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4317/v1/traces', // OTLP collector endpoint for traces
});

// Create the tracer provider
const provider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'pack-it-play-it',
  }),
});

// Add the span processor
provider.addSpanProcessor(
  new SimpleSpanProcessor(traceExporter)
);

// Register the provider
trace.setGlobalTracerProvider(provider);

// Auto-instrument web APIs
registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-fetch': {
        enabled: true
      },
      '@opentelemetry/instrumentation-xml-http-request': {
        enabled: true
      },
      '@opentelemetry/instrumentation-document-load': {
        enabled: true
      },
      '@opentelemetry/instrumentation-user-interaction': {
        enabled: true
      }
    ]
  }
});

// Simple span processor implementation (since we don't want to pull in the whole SDK)
class SimpleSpanProcessor implements SpanProcessor {
  constructor(private exporter: SpanExporter) {}

  forceFlush(): Promise<void> {
    return this.exporter.forceFlush();
  }

  onEnd(span: ReadableSpan) {
    this.exporter.export([span], () => {});
  }

  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }
}

// Initialize when the module loads
console.log('OpenTelemetry initialized for pack-it-play-it');
