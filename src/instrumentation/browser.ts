// Browser-based OpenTelemetry instrumentation
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { RegisterInstrumentation } from '@opentelemetry/instrumentation';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';

// Create the tracer provider
const provider = new WebTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'pack-it-play-it',
  }),
});

// Configure the OTLP exporter to send traces to our collector
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://192.168.1.157:4317';
const exporter = new OTLPTraceExporter({
  url: `${otlpEndpoint}/v1/traces`, // OTLP/HTTP endpoint for traces
});

// Add the span processor to the provider
provider.addSpanProcessor(
  new SimpleSpanProcessor(exporter)
);

// Register the provider
provider.register({
  contextManager: new ZoneContextManager(),
});

// Instrument popular web APIs
RegisterInstrumentation.configure({
  // Enable built-in instrumentations
  enabled: true,
});

// Auto-instrument web APIs (fetch, XMLHttpRequest, etc.)
const instrumentations = getWebAutoInstrumentations({
  // Disable unnecessary instrumentations for this app
  '@opentelemetry/instrumentation-xml-http-request': true,
  '@opentelemetry/instrumentation-fetch': true,
  '@opentelemetry/instrumentation-document-load': true,
  '@opentelemetry/instrumentation-event-listeners': true,
});

// Register all instrumentations
instrumentations.forEach((instrumentation) => {
  RegisterInstrumentation.register(instrumentation);
});

console.log('OpenTelemetry initialized for pack-it-play-it');

// Simple span processor implementation (since we don't want to pull in the full SDK just for this)
class SimpleSpanProcessor {
  constructor(private exporter: OTLPTraceExporter) {}

  forceFlush(): Promise<void> {
    return this.exporter.export([]);
  }

  onStart(span: any) {
    // No-op
  }

  onEnd(span: any) {
    this.exporter.export([span]);
  }

  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }
}
