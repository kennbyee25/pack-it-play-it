// Browser-based OpenTelemetry instrumentation
// Note: browser-specific packages (sdk-trace-web, auto-instrumentations-web)
// are not yet bundled in this project's dependencies.
// This module is reserved for future client-side telemetry.

import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const RESOURCE = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'pack-it-play-it',
});

console.log('Browser instrumentation placeholder initialized', RESOURCE);
