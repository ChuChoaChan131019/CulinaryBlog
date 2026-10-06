import { NodeSDK, tracing } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { ConsoleMetricExporter, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// Phải import/khởi tạo module này TRƯỚC mọi import khác trong main.ts: NodeSDK
// gắn instrumentation bằng require-hook, nên 'http'/'pg' phải chưa được require trước đó.
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'culinary-backend',
  }),
  traceExporter: otlpEndpoint
    ? new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` })
    : new tracing.ConsoleSpanExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: otlpEndpoint
      ? new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` })
      : new ConsoleMetricExporter(),
  }),
  instrumentations: [new HttpInstrumentation(), new PgInstrumentation()],
});

sdk.start();

process.on('SIGTERM', () => {
  void sdk.shutdown();
});
