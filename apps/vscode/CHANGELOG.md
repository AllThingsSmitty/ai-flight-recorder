# Changelog

## 0.1.0

- Provider adapters: one-line wrappers for OpenAI, Anthropic, and Google Gemini (streaming and non-streaming)
- OpenTelemetry export via `toOtlp` for ingestion into Jaeger, Grafana Tempo, Honeycomb, and other OTel-compatible backends
- User-configurable pricing overrides via `FlightRecorder({ pricing: {...} })`
- Updated cost estimates: gpt-4o corrected to $2.50/$10 per 1M tokens; claude-opus-4-5 added

## 0.0.1

- Initial release
- Custom editor for `.flight` session files
- Session header with label, duration, event count, token usage, and cost
- Scrollable event list with color-coded type badges
- JSON inspector for individual events
